import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { NotFoundException } from '@nestjs/common';
import { SlotSuggesterService } from './slot-suggester.service';
import { MasterProfile } from '../../database/entities/master-profile.entity';
import { MasterSchedule } from '../../database/entities/master-schedule.entity';
import { MasterDayOff } from '../../database/entities/master-day-off.entity';
import { Booking } from '../../database/entities/booking.entity';
import { Service } from '../../database/entities/service.entity';
import { MasterService } from '../../database/entities/master-service.entity';

const mockRepo = () => ({ findOne: jest.fn(), find: jest.fn(), createQueryBuilder: jest.fn() });

const mockConfigService = () => ({
  get: jest.fn((key: string) => {
    const map: Record<string, unknown> = {
      'intelligence.weights.rating': 0.35,
      'intelligence.weights.availability': 0.25,
      'intelligence.weights.experience': 0.2,
      'intelligence.weights.load': 0.1,
      'intelligence.weights.specialization': 0.1,
      'intelligence.lookaheadDays': 7,
      'intelligence.topSlots': 5,
    };
    return map[key];
  }),
});

const buildQb = (many: unknown[], raw?: unknown[]) => ({
  innerJoinAndSelect: jest.fn().mockReturnThis(),
  innerJoin: jest.fn().mockReturnThis(),
  leftJoinAndSelect: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  groupBy: jest.fn().mockReturnThis(),
  having: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  getMany: jest.fn().mockResolvedValue(many),
  getRawMany: jest.fn().mockResolvedValue(raw ?? []),
  getOne: jest.fn().mockResolvedValue(many[0] ?? null),
});

describe('SlotSuggesterService', () => {
  let svc: SlotSuggesterService;
  let serviceRepo: ReturnType<typeof mockRepo>;
  let masterProfileRepo: ReturnType<typeof mockRepo>;
  let masterServiceRepo: ReturnType<typeof mockRepo>;
  let bookingRepo: ReturnType<typeof mockRepo>;
  let scheduleRepo: ReturnType<typeof mockRepo>;
  let dayOffRepo: ReturnType<typeof mockRepo>;

  const masterProfile = {
    id: 1,
    rating: 4.75,
    experienceYears: 8,
    specialization: 'Технічне обслуговування',
    user: { id: 2, firstName: 'Іван', lastName: 'Коваль' },
  };

  // Next Monday at 09:00
  const getNextMonday = (): Date => {
    const d = new Date();
    d.setDate(d.getDate() + ((8 - d.getDay()) % 7 || 7));
    d.setHours(0, 0, 0, 0);
    return d;
  };

  const weekday = (d: Date): number => (d.getDay() + 6) % 7; // Mon=0

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SlotSuggesterService,
        { provide: getRepositoryToken(MasterProfile), useFactory: mockRepo },
        { provide: getRepositoryToken(MasterSchedule), useFactory: mockRepo },
        { provide: getRepositoryToken(MasterDayOff), useFactory: mockRepo },
        { provide: getRepositoryToken(Booking), useFactory: mockRepo },
        { provide: getRepositoryToken(Service), useFactory: mockRepo },
        { provide: getRepositoryToken(MasterService), useFactory: mockRepo },
        { provide: ConfigService, useFactory: mockConfigService },
      ],
    }).compile();

    svc = module.get(SlotSuggesterService);
    serviceRepo = module.get(getRepositoryToken(Service));
    masterProfileRepo = module.get(getRepositoryToken(MasterProfile));
    masterServiceRepo = module.get(getRepositoryToken(MasterService));
    bookingRepo = module.get(getRepositoryToken(Booking));
    scheduleRepo = module.get(getRepositoryToken(MasterSchedule));
    dayOffRepo = module.get(getRepositoryToken(MasterDayOff));
  });

  it('throws NotFoundException when service not found', async () => {
    serviceRepo.findOne.mockResolvedValue(null);
    await expect(svc.suggestSlots(99, new Date(), 40)).rejects.toThrow(NotFoundException);
  });

  it('returns empty array when no masters offer the service', async () => {
    serviceRepo.findOne.mockResolvedValue({ id: 1, category: null });
    masterServiceRepo.createQueryBuilder.mockReturnValue(buildQb([]));

    const result = await svc.suggestSlots(1, new Date(), 40);
    expect(result).toEqual([]);
  });

  it('returns slots with 5 reasons each', async () => {
    serviceRepo.findOne.mockResolvedValue({ id: 1, category: { name: 'ТО' } });
    masterServiceRepo.createQueryBuilder.mockReturnValue(buildQb([], [{ mpId: masterProfile.id }]));
    masterProfileRepo.find.mockResolvedValue([masterProfile]);

    const monday = getNextMonday();
    const schedule = {
      id: 1,
      master: masterProfile,
      weekday: weekday(monday),
      startTime: '09:00',
      endTime: '18:00',
      isActive: true,
    };

    bookingRepo.createQueryBuilder.mockReturnValue(buildQb([]));
    dayOffRepo.createQueryBuilder.mockReturnValue(buildQb([]));
    scheduleRepo.createQueryBuilder.mockReturnValue(buildQb([schedule]));

    const result = await svc.suggestSlots(1, monday, 40);

    expect(result.length).toBeGreaterThan(0);
    expect(result[0].reasons).toHaveLength(5);
  });

  it('respects topSlots limit of 5', async () => {
    serviceRepo.findOne.mockResolvedValue({ id: 1, category: null });
    masterServiceRepo.createQueryBuilder.mockReturnValue(buildQb([], [{ mpId: masterProfile.id }]));
    masterProfileRepo.find.mockResolvedValue([masterProfile]);

    const monday = getNextMonday();
    const schedule = {
      id: 1,
      master: masterProfile,
      weekday: weekday(monday),
      startTime: '09:00',
      endTime: '18:00',
      isActive: true,
    };

    bookingRepo.createQueryBuilder.mockReturnValue(buildQb([]));
    dayOffRepo.createQueryBuilder.mockReturnValue(buildQb([]));
    scheduleRepo.createQueryBuilder.mockReturnValue(buildQb([schedule]));

    const result = await svc.suggestSlots(1, monday, 40);

    expect(result.length).toBeLessThanOrEqual(5);
  });

  it('skips slots that overlap existing bookings', async () => {
    serviceRepo.findOne.mockResolvedValue({ id: 1, category: null });
    masterServiceRepo.createQueryBuilder.mockReturnValue(buildQb([], [{ mpId: masterProfile.id }]));
    masterProfileRepo.find.mockResolvedValue([masterProfile]);

    const monday = getNextMonday();
    const schedule = {
      id: 1,
      master: masterProfile,
      weekday: weekday(monday),
      startTime: '09:00',
      endTime: '10:00',
      isActive: true,
    };

    // Find the first Monday in the service's processing window (UTC midnight-based)
    // to avoid timezone-dependent day-offset bugs
    const serviceStart = new Date(monday);
    serviceStart.setUTCHours(0, 0, 0, 0);
    const targetMonday = new Date(serviceStart);
    while ((targetMonday.getUTCDay() + 6) % 7 !== 0) {
      targetMonday.setUTCDate(targetMonday.getUTCDate() + 1);
    }
    // Cover the entire Monday with one booking so any slot is guaranteed to overlap
    const existingBooking = {
      master: { id: masterProfile.id },
      scheduledAt: targetMonday, // 00:00 UTC of the Monday
      estimatedDurationMinutes: 24 * 60,
      status: 'CONFIRMED',
    };

    bookingRepo.createQueryBuilder.mockReturnValue(buildQb([existingBooking]));
    dayOffRepo.createQueryBuilder.mockReturnValue(buildQb([]));
    scheduleRepo.createQueryBuilder.mockReturnValue(buildQb([schedule]));

    const result = await svc.suggestSlots(1, monday, 60);

    expect(result).toEqual([]);
  });

  it('all scores are clamped to [0..1]', async () => {
    serviceRepo.findOne.mockResolvedValue({ id: 1, category: { name: 'Технічне обслуговування' } });
    masterServiceRepo.createQueryBuilder.mockReturnValue(buildQb([], [{ mpId: masterProfile.id }]));
    masterProfileRepo.find.mockResolvedValue([
      { ...masterProfile, rating: 5, experienceYears: 20 },
    ]);

    const monday = getNextMonday();
    const schedule = {
      id: 1,
      master: masterProfile,
      weekday: weekday(monday),
      startTime: '09:00',
      endTime: '10:00',
      isActive: true,
    };

    bookingRepo.createQueryBuilder.mockReturnValue(buildQb([]));
    dayOffRepo.createQueryBuilder.mockReturnValue(buildQb([]));
    scheduleRepo.createQueryBuilder.mockReturnValue(buildQb([schedule]));

    const result = await svc.suggestSlots(1, monday, 30);

    for (const slot of result) {
      expect(slot.score).toBeGreaterThanOrEqual(0);
      expect(slot.score).toBeLessThanOrEqual(1);
    }
  });

  it('results are sorted by score descending', async () => {
    serviceRepo.findOne.mockResolvedValue({ id: 1, category: null });
    const masterObjects = [
      {
        id: 1,
        rating: 5,
        experienceYears: 10,
        specialization: null,
        user: { firstName: 'A', lastName: 'B' },
      },
      {
        id: 2,
        rating: 2,
        experienceYears: 1,
        specialization: null,
        user: { firstName: 'C', lastName: 'D' },
      },
    ];
    masterServiceRepo.createQueryBuilder.mockReturnValue(
      buildQb(
        [],
        masterObjects.map((m) => ({ mpId: m.id })),
      ),
    );
    masterProfileRepo.find.mockResolvedValue(masterObjects);

    const monday = getNextMonday();
    const schedules = [
      {
        id: 1,
        master: { id: 1 },
        weekday: weekday(monday),
        startTime: '09:00',
        endTime: '10:00',
        isActive: true,
      },
      {
        id: 2,
        master: { id: 2 },
        weekday: weekday(monday),
        startTime: '09:00',
        endTime: '10:00',
        isActive: true,
      },
    ];

    bookingRepo.createQueryBuilder.mockReturnValue(buildQb([]));
    dayOffRepo.createQueryBuilder.mockReturnValue(buildQb([]));
    scheduleRepo.createQueryBuilder.mockReturnValue(buildQb(schedules));

    const result = await svc.suggestSlots(1, monday, 30);

    for (let i = 1; i < result.length; i++) {
      expect(result[i - 1].score).toBeGreaterThanOrEqual(result[i].score);
    }
  });

  it('skips day-off dates', async () => {
    serviceRepo.findOne.mockResolvedValue({ id: 1, category: null });
    masterServiceRepo.createQueryBuilder.mockReturnValue(buildQb([], [{ mpId: masterProfile.id }]));
    masterProfileRepo.find.mockResolvedValue([masterProfile]);

    const monday = getNextMonday();
    const schedule = {
      id: 1,
      master: masterProfile,
      weekday: weekday(monday),
      startTime: '09:00',
      endTime: '18:00',
      isActive: true,
    };

    const dayOff = {
      id: 1,
      master: masterProfile,
      date: monday.toISOString().slice(0, 10),
      reason: null,
    };

    bookingRepo.createQueryBuilder.mockReturnValue(buildQb([]));
    dayOffRepo.createQueryBuilder.mockReturnValue(buildQb([dayOff]));
    scheduleRepo.createQueryBuilder.mockReturnValue(buildQb([schedule]));

    // With only Monday in lookahead and it's a day off
    const result = await svc.suggestSlots(1, monday, 40);

    // All slots from Monday should be skipped; may still have slots from other days
    const mondaySlots = result.filter((s) =>
      s.startAt.startsWith(monday.toISOString().slice(0, 10)),
    );
    expect(mondaySlots).toEqual([]);
  });
});
