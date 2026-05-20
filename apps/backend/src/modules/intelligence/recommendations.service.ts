import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { MasterProfile } from '../../database/entities/master-profile.entity';
import { Booking } from '../../database/entities/booking.entity';
import { Service } from '../../database/entities/service.entity';
import { MasterService } from '../../database/entities/master-service.entity';
import { BookingService as BookingServiceEntity } from '../../database/entities/booking-service.entity';
import { Review } from '../../database/entities/review.entity';
import { BookingStatus } from '../../common/enums/booking-status.enum';
import { MasterRecommendationDto } from './dto/recommendations-response.dto';
import { ServiceReminderDto } from './dto/service-reminder.dto';

interface Weights {
  rating: number;
  availability: number;
  experience: number;
  load: number;
  specialization: number;
}

@Injectable()
export class RecommendationsService {
  private readonly weights: Weights;
  private readonly minDataPoints: number;

  constructor(
    @InjectRepository(MasterProfile)
    private readonly masterProfileRepo: Repository<MasterProfile>,
    @InjectRepository(Booking)
    private readonly bookingRepo: Repository<Booking>,
    @InjectRepository(Service)
    private readonly serviceRepo: Repository<Service>,
    @InjectRepository(MasterService)
    private readonly masterServiceRepo: Repository<MasterService>,
    @InjectRepository(BookingServiceEntity)
    private readonly bookingServiceRepo: Repository<BookingServiceEntity>,
    @InjectRepository(Review)
    private readonly reviewRepo: Repository<Review>,
    private readonly configService: ConfigService,
  ) {
    this.weights = {
      rating: this.configService.get<number>('intelligence.weights.rating') ?? 0.35,
      availability: this.configService.get<number>('intelligence.weights.availability') ?? 0.25,
      experience: this.configService.get<number>('intelligence.weights.experience') ?? 0.20,
      load: this.configService.get<number>('intelligence.weights.load') ?? 0.10,
      specialization: this.configService.get<number>('intelligence.weights.specialization') ?? 0.10,
    };
    this.minDataPoints = this.configService.get<number>('intelligence.minDataPoints') ?? 5;
  }

  async recommend(clientId: number, serviceId: number): Promise<MasterRecommendationDto[]> {
    const service = await this.serviceRepo.findOne({
      where: { id: serviceId },
      relations: ['category'],
    });
    if (!service) return [];

    // All masters offering this service
    const masterLinks = await this.masterServiceRepo
      .createQueryBuilder('ms')
      .innerJoinAndSelect('ms.master', 'mp')
      .innerJoinAndSelect('mp.user', 'u')
      .where('ms.service = :serviceId', { serviceId })
      .getMany();

    if (masterLinks.length === 0) return [];

    const masters = masterLinks.map((ml) => ml.master);
    const masterIds = masters.map((m) => m.id);

    // Bulk-load all data — no per-master queries
    const [clientCompletedBookings, allMasterReviews, activeMasterBookings] = await Promise.all([
      this.bookingRepo
        .createQueryBuilder('b')
        .where('b.client = :clientId', { clientId })
        .andWhere('b.status = :status', { status: BookingStatus.COMPLETED })
        .getMany(),
      this.reviewRepo
        .createQueryBuilder('r')
        .innerJoin('r.booking', 'b')
        .where('b.master IN (:...masterIds)', { masterIds })
        .select(['r.rating as rating', 'b.masterId as masterId'])
        .getRawMany<{ rating: string; masterId: number }>(),
      this.bookingRepo
        .createQueryBuilder('b')
        .where('b.master IN (:...masterIds)', { masterIds })
        .andWhere('b.status IN (:...statuses)', {
          statuses: [BookingStatus.PENDING, BookingStatus.CONFIRMED, BookingStatus.IN_PROGRESS],
        })
        .select(['b.masterId as masterId', 'COUNT(b.id) as cnt'])
        .groupBy('b.masterId')
        .getRawMany<{ masterId: number; cnt: string }>(),
    ]);

    // Collaborative: client's personal rating per master
    const clientMasterRating = new Map<number, { sum: number; count: number }>();
    for (const booking of clientCompletedBookings) {
      const mid = (booking as unknown as { masterId: number }).masterId;
      if (!mid || !masterIds.includes(mid)) continue;
      const cur = clientMasterRating.get(mid) ?? { sum: 0, count: 0 };
      cur.count += 1;
      clientMasterRating.set(mid, cur);
    }

    // Global review aggregates per master
    const globalRatings = new Map<number, { sum: number; count: number }>();
    for (const row of allMasterReviews) {
      const mid = row.masterId;
      if (!mid) continue;
      const cur = globalRatings.get(mid) ?? { sum: 0, count: 0 };
      cur.sum += Number(row.rating);
      cur.count += 1;
      globalRatings.set(mid, cur);
    }

    // Active bookings per master (lower = less loaded = better)
    const activeBookingsMap = new Map<number, number>();
    for (const row of activeMasterBookings) {
      activeBookingsMap.set(Number(row.masterId), Number(row.cnt));
    }

    const results: MasterRecommendationDto[] = [];

    for (const master of masters) {
      // Factor 1 (rating): global rating if enough data, else profile rating
      const globalData = globalRatings.get(master.id);
      const ratingScore = globalData && globalData.count >= this.minDataPoints
        ? Math.min(globalData.sum / globalData.count / 5, 1)
        : Math.min(Number(master.rating ?? 0) / 5, 1);

      // Factor 2 (availability / collaborative): personal client experience with this master
      const personalData = clientMasterRating.get(master.id);
      const collaborativeScore = personalData && personalData.count > 0
        ? Math.min(personalData.count / 5, 1)  // more bookings = higher trust
        : 0.5;

      // Factor 3 (experience): years / 10 capped at 1
      const experienceScore = Math.min((master.experienceYears ?? 0) / 10, 1);

      // Factor 4 (load): fewer active bookings = less loaded = preferred
      const activeCount = activeBookingsMap.get(master.id) ?? 0;
      const loadScore = Math.max(0, 1 - activeCount / 10);

      // Factor 5 (specialization): keyword match between master specialization and service category
      const specializationScore = this.computeSpecScore(
        master.specialization ?? '',
        service.category?.name ?? '',
      );

      const score = Math.min(
        1,
        this.weights.rating * ratingScore +
          this.weights.availability * collaborativeScore +
          this.weights.experience * experienceScore +
          this.weights.load * loadScore +
          this.weights.specialization * specializationScore,
      );

      results.push({
        masterId: master.id,
        masterName: `${master.user?.firstName ?? ''} ${master.user?.lastName ?? ''}`.trim(),
        score: Math.round(score * 1000) / 1000,
        rating: Number(master.rating ?? 0),
        experienceYears: Number(master.experienceYears ?? 0),
        specialization: master.specialization ?? '',
        reasons: [
          `Рейтинг: ${Math.round(ratingScore * 100)}%`,
          `Особистий досвід: ${Math.round(collaborativeScore * 100)}%`,
          `Досвід роботи: ${Math.round(experienceScore * 100)}%`,
          `Завантаженість: ${activeCount === 0 ? 'вільний' : `${activeCount} актив. записів`}`,
          `Спеціалізація: ${Math.round(specializationScore * 100)}%`,
        ],
      });
    }

    return results.sort((a, b) => b.score - a.score).slice(0, 5);
  }

  async getReminders(clientId: number): Promise<ServiceReminderDto[]> {
    // Find the most recent completed booking per service for this client
    const rows = await this.bookingServiceRepo
      .createQueryBuilder('bs')
      .innerJoin('bs.booking', 'b')
      .innerJoin('bs.service', 's')
      .where('b.client = :clientId', { clientId })
      .andWhere('b.status = :status', { status: BookingStatus.COMPLETED })
      .andWhere('s.recommendedIntervalDays IS NOT NULL')
      .select([
        's.id AS serviceId',
        's.name AS serviceName',
        's.recommendedIntervalDays AS intervalDays',
        'MAX(b.scheduledAt) AS lastDate',
        'b.id AS bookingId',
      ])
      .groupBy('s.id')
      .addGroupBy('s.name')
      .addGroupBy('s.recommendedIntervalDays')
      .addGroupBy('b.id')
      .getRawMany<{
        serviceId: number;
        serviceName: string;
        intervalDays: number;
        lastDate: string;
        bookingId: number;
      }>();

    const today = new Date();
    const reminders: ServiceReminderDto[] = [];

    for (const row of rows) {
      const lastDate = new Date(row.lastDate);
      const nextDate = new Date(lastDate);
      nextDate.setDate(nextDate.getDate() + Number(row.intervalDays));

      const msOverdue = today.getTime() - nextDate.getTime();
      const daysOverdue = Math.floor(msOverdue / 86_400_000);

      // Only surface reminders within 30 days upcoming or already overdue
      if (daysOverdue < -30) continue;

      reminders.push({
        serviceId: Number(row.serviceId),
        serviceName: row.serviceName,
        lastServiceDate: lastDate.toISOString().slice(0, 10),
        nextRecommendedDate: nextDate.toISOString().slice(0, 10),
        daysOverdue: Math.max(0, daysOverdue),
        isOverdue: daysOverdue >= 0,
        lastBookingId: Number(row.bookingId),
      });
    }

    return reminders.sort((a, b) => b.daysOverdue - a.daysOverdue);
  }

  private computeSpecScore(specialization: string, categoryName: string): number {
    if (!specialization || !categoryName) return 0.5;
    const keywords = categoryName.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
    return keywords.some((kw) => specialization.toLowerCase().includes(kw)) ? 1.0 : 0.5;
  }
}
