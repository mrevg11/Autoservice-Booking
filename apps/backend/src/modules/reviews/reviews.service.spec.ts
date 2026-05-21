import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { Review } from '../../database/entities/review.entity';
import { Booking } from '../../database/entities/booking.entity';
import { MasterProfile } from '../../database/entities/master-profile.entity';
import { BookingStatus } from '../../common/enums/booking-status.enum';

const mockRepo = () => ({
  findOne: jest.fn(),
  find: jest.fn(),
  create: jest.fn().mockImplementation((d) => d),
  save: jest.fn().mockImplementation(async (d) => d),
  update: jest.fn().mockResolvedValue(undefined),
  createQueryBuilder: jest.fn(),
});

describe('ReviewsService.create', () => {
  let service: ReviewsService;
  let reviewsRepo: ReturnType<typeof mockRepo>;
  let bookingsRepo: ReturnType<typeof mockRepo>;
  let masterProfilesRepo: ReturnType<typeof mockRepo>;

  const makeBooking = (overrides = {}) => ({
    id: 1,
    status: BookingStatus.COMPLETED,
    client: { id: 1 },
    master: { id: 1 },
    ...overrides,
  });

  const dto = { bookingId: 1, rating: 5, comment: 'Great!' };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReviewsService,
        { provide: getRepositoryToken(Review), useFactory: mockRepo },
        { provide: getRepositoryToken(Booking), useFactory: mockRepo },
        { provide: getRepositoryToken(MasterProfile), useFactory: mockRepo },
      ],
    }).compile();

    service = module.get(ReviewsService);
    reviewsRepo = module.get(getRepositoryToken(Review));
    bookingsRepo = module.get(getRepositoryToken(Booking));
    masterProfilesRepo = module.get(getRepositoryToken(MasterProfile));

    // Default: avg rating query
    const mockQb = {
      select: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getRawOne: jest.fn().mockResolvedValue({ avg: '4.5' }),
    };
    reviewsRepo.createQueryBuilder.mockReturnValue(mockQb);
  });

  it('кидає BadRequestException якщо booking не COMPLETED', async () => {
    bookingsRepo.findOne.mockResolvedValue(makeBooking({ status: BookingStatus.CONFIRMED }));
    await expect(service.create(1, dto)).rejects.toThrow(BadRequestException);
  });

  it('кидає ForbiddenException якщо booking чужий', async () => {
    bookingsRepo.findOne.mockResolvedValue(makeBooking({ client: { id: 99 } }));
    await expect(service.create(1, dto)).rejects.toThrow(ForbiddenException);
  });

  it('кидає ConflictException якщо review вже існує', async () => {
    bookingsRepo.findOne.mockResolvedValue(makeBooking());
    reviewsRepo.findOne.mockResolvedValue({ id: 1 }); // already exists
    await expect(service.create(1, dto)).rejects.toThrow(ConflictException);
  });

  it('оновлює MasterProfile.rating після збереження', async () => {
    bookingsRepo.findOne.mockResolvedValue(makeBooking());
    reviewsRepo.findOne.mockResolvedValue(null);
    reviewsRepo.save.mockResolvedValue({ id: 2, rating: 5 });

    await service.create(1, dto);

    expect(masterProfilesRepo.update).toHaveBeenCalledWith(1, { rating: 4.5 });
  });

  it('кидає NotFoundException якщо booking не існує', async () => {
    bookingsRepo.findOne.mockResolvedValue(null);
    await expect(service.create(1, dto)).rejects.toThrow(NotFoundException);
  });
});
