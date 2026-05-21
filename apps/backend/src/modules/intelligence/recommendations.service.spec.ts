import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { RecommendationsService } from './recommendations.service';
import { MasterProfile } from '../../database/entities/master-profile.entity';
import { Booking } from '../../database/entities/booking.entity';
import { Service } from '../../database/entities/service.entity';
import { MasterService } from '../../database/entities/master-service.entity';
import { Review } from '../../database/entities/review.entity';

const mockRepo = () => ({
  findOne: jest.fn(),
  createQueryBuilder: jest.fn(),
});

const mockConfigService = () => ({
  get: jest.fn((key: string) => {
    const map: Record<string, unknown> = {
      'intelligence.weights.rating': 0.35,
      'intelligence.weights.availability': 0.25,
      'intelligence.weights.experience': 0.2,
      'intelligence.weights.load': 0.1,
      'intelligence.weights.specialization': 0.1,
      'intelligence.minDataPoints': 5,
    };
    return map[key];
  }),
});

const buildQb = (returnValue: unknown) => ({
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
  getMany: jest.fn().mockResolvedValue(returnValue),
  getRawMany: jest.fn().mockResolvedValue(returnValue),
  getOne: jest.fn().mockResolvedValue(Array.isArray(returnValue) ? (returnValue[0] ?? null) : null),
});

describe('RecommendationsService', () => {
  let svc: RecommendationsService;
  let serviceRepo: ReturnType<typeof mockRepo>;
  let masterServiceRepo: ReturnType<typeof mockRepo>;
  let bookingRepo: ReturnType<typeof mockRepo>;
  let reviewRepo: ReturnType<typeof mockRepo>;

  const masterProfile = {
    id: 1,
    rating: 4.5,
    experienceYears: 8,
    specialization: 'Технічне обслуговування та діагностика',
    user: { firstName: 'Іван', lastName: 'Коваль', id: 2 },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecommendationsService,
        { provide: getRepositoryToken(MasterProfile), useFactory: mockRepo },
        { provide: getRepositoryToken(Booking), useFactory: mockRepo },
        { provide: getRepositoryToken(Service), useFactory: mockRepo },
        { provide: getRepositoryToken(MasterService), useFactory: mockRepo },
        { provide: getRepositoryToken(Review), useFactory: mockRepo },
        { provide: ConfigService, useFactory: mockConfigService },
      ],
    }).compile();

    svc = module.get(RecommendationsService);
    serviceRepo = module.get(getRepositoryToken(Service));
    masterServiceRepo = module.get(getRepositoryToken(MasterService));
    bookingRepo = module.get(getRepositoryToken(Booking));
    reviewRepo = module.get(getRepositoryToken(Review));
  });

  it('returns empty array when service not found', async () => {
    serviceRepo.findOne.mockResolvedValue(null);
    const result = await svc.recommend(1, 99);
    expect(result).toEqual([]);
  });

  it('returns empty array when no masters offer the service', async () => {
    serviceRepo.findOne.mockResolvedValue({ id: 1, category: null });
    masterServiceRepo.createQueryBuilder.mockReturnValue(buildQb([]));

    const result = await svc.recommend(1, 1);
    expect(result).toEqual([]);
  });

  it('returns recommendations with 5 reasons each', async () => {
    serviceRepo.findOne.mockResolvedValue({
      id: 1,
      category: { name: 'Технічне обслуговування' },
    });
    masterServiceRepo.createQueryBuilder.mockReturnValue(buildQb([{ master: masterProfile }]));
    bookingRepo.createQueryBuilder.mockReturnValue(buildQb([]));
    reviewRepo.createQueryBuilder.mockReturnValue(buildQb([]));

    const result = await svc.recommend(1, 1);

    expect(result).toHaveLength(1);
    expect(result[0].reasons).toHaveLength(5);
  });

  it('score is clamped to [0..1]', async () => {
    serviceRepo.findOne.mockResolvedValue({
      id: 1,
      category: { name: 'Технічне обслуговування' },
    });
    masterServiceRepo.createQueryBuilder.mockReturnValue(
      buildQb([{ master: { ...masterProfile, rating: 5, experienceYears: 20 } }]),
    );
    bookingRepo.createQueryBuilder.mockReturnValue(buildQb([]));
    reviewRepo.createQueryBuilder.mockReturnValue(buildQb([]));

    const result = await svc.recommend(1, 1);

    expect(result[0].score).toBeGreaterThanOrEqual(0);
    expect(result[0].score).toBeLessThanOrEqual(1);
  });

  it('sorts recommendations by score descending', async () => {
    serviceRepo.findOne.mockResolvedValue({ id: 1, category: null });
    const masters = [
      {
        master: {
          id: 1,
          rating: 2,
          experienceYears: 1,
          specialization: null,
          user: { firstName: 'A', lastName: 'B' },
        },
      },
      {
        master: {
          id: 2,
          rating: 5,
          experienceYears: 10,
          specialization: null,
          user: { firstName: 'C', lastName: 'D' },
        },
      },
    ];
    masterServiceRepo.createQueryBuilder.mockReturnValue(buildQb(masters));
    bookingRepo.createQueryBuilder.mockReturnValue(buildQb([]));
    reviewRepo.createQueryBuilder.mockReturnValue(buildQb([]));

    const result = await svc.recommend(1, 1);

    expect(result[0].score).toBeGreaterThanOrEqual(result[1]?.score ?? 0);
  });

  it('limits results to max 5', async () => {
    serviceRepo.findOne.mockResolvedValue({ id: 1, category: null });
    const masters = Array.from({ length: 10 }, (_, i) => ({
      master: {
        id: i + 1,
        rating: 3,
        experienceYears: 3,
        specialization: null,
        user: { firstName: 'X', lastName: `${i}` },
      },
    }));
    masterServiceRepo.createQueryBuilder.mockReturnValue(buildQb(masters));
    bookingRepo.createQueryBuilder.mockReturnValue(buildQb([]));
    reviewRepo.createQueryBuilder.mockReturnValue(buildQb([]));

    const result = await svc.recommend(1, 1);

    expect(result.length).toBeLessThanOrEqual(5);
  });
});
