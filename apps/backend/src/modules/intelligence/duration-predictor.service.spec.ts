import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { NotFoundException } from '@nestjs/common';
import { DurationPredictorService } from './duration-predictor.service';
import { Service } from '../../database/entities/service.entity';
import { BookingService as BookingServiceEntity } from '../../database/entities/booking-service.entity';

const mockServiceRepo = () => ({ findOne: jest.fn() });
const mockBookingServiceRepo = () => ({ createQueryBuilder: jest.fn() });
const mockConfigService = () => ({
  get: jest.fn((key: string) => {
    const map: Record<string, unknown> = {
      'intelligence.minDataPoints': 5,
    };
    return map[key];
  }),
});

describe('DurationPredictorService', () => {
  let service: DurationPredictorService;
  let serviceRepo: ReturnType<typeof mockServiceRepo>;
  let bookingServiceRepo: ReturnType<typeof mockBookingServiceRepo>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DurationPredictorService,
        { provide: getRepositoryToken(Service), useFactory: mockServiceRepo },
        { provide: getRepositoryToken(BookingServiceEntity), useFactory: mockBookingServiceRepo },
        { provide: ConfigService, useFactory: mockConfigService },
      ],
    }).compile();

    service = module.get(DurationPredictorService);
    serviceRepo = module.get(getRepositoryToken(Service));
    bookingServiceRepo = module.get(getRepositoryToken(BookingServiceEntity));
  });

  it('throws NotFoundException when service not found', async () => {
    serviceRepo.findOne.mockResolvedValue(null);
    await expect(service.predict(99)).rejects.toThrow(NotFoundException);
  });

  it('returns base duration with all coeffs=1.0 when no master or vehicle', async () => {
    serviceRepo.findOne.mockResolvedValue({ id: 1, baseDurationMinutes: 40 });
    const qb = { innerJoin: jest.fn().mockReturnThis(), where: jest.fn().mockReturnThis(), andWhere: jest.fn().mockReturnThis(), select: jest.fn().mockReturnThis(), getRawMany: jest.fn().mockResolvedValue([]) };
    bookingServiceRepo.createQueryBuilder.mockReturnValue(qb);

    const result = await service.predict(1);

    // No master, no vehicleYear, month=May → seasonCoeff=1.0, masterCoeff=1.0
    expect(result.baseDurationMinutes).toBe(40);
    expect(result.masterCoeff).toBe(1.0);
    expect(result.vehicleAgeCoeff).toBe(1.0);
  });

  it('applies vehicleAgeCoeff=1.1 for vehicle aged 10 years', async () => {
    serviceRepo.findOne.mockResolvedValue({ id: 1, baseDurationMinutes: 40 });
    const qb = { innerJoin: jest.fn().mockReturnThis(), where: jest.fn().mockReturnThis(), andWhere: jest.fn().mockReturnThis(), select: jest.fn().mockReturnThis(), getRawMany: jest.fn().mockResolvedValue([]) };
    bookingServiceRepo.createQueryBuilder.mockReturnValue(qb);

    const currentYear = new Date().getFullYear();
    const result = await service.predict(1, undefined, currentYear - 10);

    expect(result.vehicleAgeCoeff).toBe(1.1);
  });

  it('applies vehicleAgeCoeff=0.95 for brand new vehicle', async () => {
    serviceRepo.findOne.mockResolvedValue({ id: 1, baseDurationMinutes: 40 });
    const qb = { innerJoin: jest.fn().mockReturnThis(), where: jest.fn().mockReturnThis(), andWhere: jest.fn().mockReturnThis(), select: jest.fn().mockReturnThis(), getRawMany: jest.fn().mockResolvedValue([]) };
    bookingServiceRepo.createQueryBuilder.mockReturnValue(qb);

    const result = await service.predict(1, undefined, new Date().getFullYear());

    expect(result.vehicleAgeCoeff).toBe(0.95);
  });

  it('uses masterCoeff=1.0 when fewer than minDataPoints historical records', async () => {
    serviceRepo.findOne.mockResolvedValue({ id: 1, baseDurationMinutes: 40 });
    const qb = { innerJoin: jest.fn().mockReturnThis(), where: jest.fn().mockReturnThis(), andWhere: jest.fn().mockReturnThis(), select: jest.fn().mockReturnThis(), getRawMany: jest.fn().mockResolvedValue([{ dur: 50 }, { dur: 60 }]) };
    bookingServiceRepo.createQueryBuilder.mockReturnValue(qb);

    const result = await service.predict(1, 1);

    expect(result.masterCoeff).toBe(1.0); // only 2 records < minDataPoints=5
  });

  it('computes masterCoeff from sufficient historical data and clamps to [0.5..2.0]', async () => {
    serviceRepo.findOne.mockResolvedValue({ id: 1, baseDurationMinutes: 40 });
    // 5 records averaging 60 → coeff = 60/40 = 1.5
    const rows = Array.from({ length: 5 }, () => ({ dur: 60 }));
    const qb = { innerJoin: jest.fn().mockReturnThis(), where: jest.fn().mockReturnThis(), andWhere: jest.fn().mockReturnThis(), select: jest.fn().mockReturnThis(), getRawMany: jest.fn().mockResolvedValue(rows) };
    bookingServiceRepo.createQueryBuilder.mockReturnValue(qb);

    const result = await service.predict(1, 1);

    expect(result.masterCoeff).toBe(1.5);
    expect(result.estimatedMinutes).toBeGreaterThan(40);
  });

  it('clamps masterCoeff to max 2.0', async () => {
    serviceRepo.findOne.mockResolvedValue({ id: 1, baseDurationMinutes: 10 });
    const rows = Array.from({ length: 5 }, () => ({ dur: 100 })); // avg=100, coeff=10 → clamped to 2.0
    const qb = { innerJoin: jest.fn().mockReturnThis(), where: jest.fn().mockReturnThis(), andWhere: jest.fn().mockReturnThis(), select: jest.fn().mockReturnThis(), getRawMany: jest.fn().mockResolvedValue(rows) };
    bookingServiceRepo.createQueryBuilder.mockReturnValue(qb);

    const result = await service.predict(1, 1);

    expect(result.masterCoeff).toBe(2.0);
  });
});
