import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { MastersService } from './masters.service';
import { MasterProfile } from '../../database/entities/master-profile.entity';
import { MasterSchedule } from '../../database/entities/master-schedule.entity';
import { MasterDayOff } from '../../database/entities/master-day-off.entity';
import { MasterService as MasterServiceEntity } from '../../database/entities/master-service.entity';
import { Service } from '../../database/entities/service.entity';
import { Booking } from '../../database/entities/booking.entity';

const TODAY_DATE = '2026-12-15'; // Monday (Пн = weekday 0 in app)

const mockRepo = () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  findAndCount: jest.fn(),
  create: jest.fn().mockImplementation((d) => d),
  save: jest.fn().mockImplementation(async (d) => d),
  remove: jest.fn(),
  delete: jest.fn(),
  createQueryBuilder: jest.fn(),
});

describe('MastersService.getAvailableSlots', () => {
  let service: MastersService;
  let masterProfilesRepo: ReturnType<typeof mockRepo>;
  let schedulesRepo: ReturnType<typeof mockRepo>;
  let daysOffRepo: ReturnType<typeof mockRepo>;
  let bookingsRepo: ReturnType<typeof mockRepo>;

  const mockMaster = { id: 1 } as MasterProfile;
  const monSchedule: Partial<MasterSchedule> = {
    weekday: 0, // Пн
    startTime: '09:00',
    endTime: '18:00',
    isActive: true,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MastersService,
        { provide: getRepositoryToken(MasterProfile), useFactory: mockRepo },
        { provide: getRepositoryToken(MasterSchedule), useFactory: mockRepo },
        { provide: getRepositoryToken(MasterDayOff), useFactory: mockRepo },
        { provide: getRepositoryToken(MasterServiceEntity), useFactory: mockRepo },
        { provide: getRepositoryToken(Service), useFactory: mockRepo },
        { provide: getRepositoryToken(Booking), useFactory: mockRepo },
        { provide: DataSource, useValue: { transaction: jest.fn() } },
      ],
    }).compile();

    service = module.get(MastersService);
    masterProfilesRepo = module.get(getRepositoryToken(MasterProfile));
    schedulesRepo = module.get(getRepositoryToken(MasterSchedule));
    daysOffRepo = module.get(getRepositoryToken(MasterDayOff));
    bookingsRepo = module.get(getRepositoryToken(Booking));

    // Default: master exists
    masterProfilesRepo.findOne.mockResolvedValue(mockMaster);
    // Default: no day off
    daysOffRepo.findOne.mockResolvedValue(null);
    // Default: no existing bookings
    const mockQb = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    };
    bookingsRepo.createQueryBuilder.mockReturnValue(mockQb);
  });

  it('повертає порожній масив якщо day-off', async () => {
    daysOffRepo.findOne.mockResolvedValue({ id: 1, date: TODAY_DATE });
    const slots = await service.getAvailableSlots(1, TODAY_DATE, 60);
    expect(slots).toEqual([]);
  });

  it('повертає порожній масив якщо немає розкладу на цей день', async () => {
    schedulesRepo.findOne.mockResolvedValue(null);
    const slots = await service.getAvailableSlots(1, TODAY_DATE, 60);
    expect(slots).toEqual([]);
  });

  it('виключає зайняті слоти', async () => {
    schedulesRepo.findOne.mockResolvedValue(monSchedule);

    // Booking at 09:00, duration 60 min → blocks 09:00 slot
    const occupiedBooking = {
      scheduledAt: new Date(`${TODAY_DATE}T09:00:00`),
      estimatedDurationMinutes: 60,
    };
    const mockQb = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([occupiedBooking]),
    };
    bookingsRepo.createQueryBuilder.mockReturnValue(mockQb);

    // Use a far-future date to avoid "past slot" filtering
    const futureDate = '2099-06-16';
    masterProfilesRepo.findOne.mockResolvedValue(mockMaster);
    daysOffRepo.findOne.mockResolvedValue(null);
    schedulesRepo.findOne.mockResolvedValue({ ...monSchedule });

    // futureDate = '2099-06-16' is summer in Kyiv (UTC+3)
    // 09:00 Kyiv = 06:00 UTC
    const futureQb = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([
        {
          scheduledAt: new Date(`${futureDate}T06:00:00.000Z`),
          estimatedDurationMinutes: 60,
        },
      ]),
    };
    bookingsRepo.createQueryBuilder.mockReturnValue(futureQb);

    const slots = await service.getAvailableSlots(1, futureDate, 60);
    expect(slots).not.toContain('09:00');
    expect(slots).toContain('10:00');
  });

  it('не повертає слоти у минулому', async () => {
    schedulesRepo.findOne.mockResolvedValue(monSchedule);
    // Use a past date — all slots should be filtered as past
    const pastDate = '2020-01-06'; // Monday
    // Set weekday-matching schedule for pastDate
    schedulesRepo.findOne.mockResolvedValue({ ...monSchedule, weekday: 0 });

    const mockQb = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    };
    bookingsRepo.createQueryBuilder.mockReturnValue(mockQb);

    const slots = await service.getAvailableSlots(1, pastDate, 60);
    expect(slots).toEqual([]);
  });

  it('правильно розраховує overlap за тривалістю', async () => {
    const futureDate = '2099-06-16';
    schedulesRepo.findOne.mockResolvedValue({ ...monSchedule });

    // Booking at 10:00 Kyiv (UTC+3 in June) = 07:00 UTC, 120 min → blocks 10:00 and 10:30
    const futureQb = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([
        {
          scheduledAt: new Date(`${futureDate}T07:00:00.000Z`),
          estimatedDurationMinutes: 120,
        },
      ]),
    };
    bookingsRepo.createQueryBuilder.mockReturnValue(futureQb);

    const slots = await service.getAvailableSlots(1, futureDate, 30);
    expect(slots).not.toContain('10:00');
    expect(slots).not.toContain('10:30');
    expect(slots).toContain('12:00');
  });

  it('повертає порожній масив якщо всі слоти зайняті', async () => {
    const futureDate = '2099-06-16';
    schedulesRepo.findOne.mockResolvedValue({
      ...monSchedule,
      startTime: '09:00',
      endTime: '10:00',
    });

    // One 60-min booking at 09:00 Kyiv (UTC+3 in June) = 06:00 UTC, fills 09:00-10:00 window
    const futureQb = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([
        {
          scheduledAt: new Date(`${futureDate}T06:00:00.000Z`),
          estimatedDurationMinutes: 60,
        },
      ]),
    };
    bookingsRepo.createQueryBuilder.mockReturnValue(futureQb);

    const slots = await service.getAvailableSlots(1, futureDate, 60);
    expect(slots).toEqual([]);
  });
});
