import {
  Injectable,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Review } from '../../database/entities/review.entity';
import { Booking } from '../../database/entities/booking.entity';
import { MasterProfile } from '../../database/entities/master-profile.entity';
import { BookingStatus } from '../../common/enums/booking-status.enum';
import { PaginationDto, paginate, PaginatedResult } from '../../common/dto/pagination.dto';
import { CreateReviewDto } from './dto/create-review.dto';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(Review)
    private reviewsRepo: Repository<Review>,
    @InjectRepository(Booking)
    private bookingsRepo: Repository<Booking>,
    @InjectRepository(MasterProfile)
    private masterProfilesRepo: Repository<MasterProfile>,
  ) {}

  async create(clientId: number, dto: CreateReviewDto): Promise<Review> {
    const booking = await this.bookingsRepo.findOne({
      where: { id: dto.bookingId },
      relations: ['client', 'master'],
    });

    if (!booking) throw new NotFoundException(`Booking #${dto.bookingId} not found`);

    if (!booking.client || booking.client.id !== clientId) {
      throw new ForbiddenException('This booking does not belong to you');
    }

    if (booking.status !== BookingStatus.COMPLETED) {
      throw new BadRequestException('Booking is not completed');
    }

    const existing = await this.reviewsRepo.findOne({
      where: { booking: { id: dto.bookingId } },
    });
    if (existing) throw new ConflictException('Review for this booking already exists');

    const review = this.reviewsRepo.create({
      booking,
      rating: dto.rating,
      comment: dto.comment ?? null,
    });
    const saved = await this.reviewsRepo.save(review);

    // Update master rating
    await this.recalculateMasterRating(booking.master.id);

    return saved;
  }

  async findForMaster(
    masterId: number,
    pagination: PaginationDto,
  ): Promise<PaginatedResult<Review>> {
    const { page = 1, limit = 20 } = pagination;
    const [data, total] = await this.reviewsRepo
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.booking', 'booking')
      .leftJoinAndSelect('booking.client', 'client')
      .where('booking.masterId = :masterId', { masterId })
      .orderBy('r.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    // Strip sensitive fields
    data.forEach((r) => {
      if (r.booking?.client) {
        const u = r.booking.client as unknown as Record<string, unknown>;
        delete u['passwordHash'];
        delete u['refreshTokenHash'];
        delete u['emailVerificationToken'];
        delete u['passwordResetToken'];
      }
    });

    return paginate(data, total, pagination);
  }

  async findForBooking(bookingId: number): Promise<Review | null> {
    return this.reviewsRepo.findOne({
      where: { booking: { id: bookingId } },
      relations: ['booking'],
    });
  }

  private async recalculateMasterRating(masterId: number): Promise<void> {
    const result = await this.reviewsRepo
      .createQueryBuilder('r')
      .select('AVG(r.rating)', 'avg')
      .leftJoin('r.booking', 'b')
      .where('b.masterId = :masterId', { masterId })
      .getRawOne<{ avg: string }>();

    const avg = result?.avg ? Math.round(parseFloat(result.avg) * 100) / 100 : 0;
    await this.masterProfilesRepo.update(masterId, { rating: avg });
  }
}
