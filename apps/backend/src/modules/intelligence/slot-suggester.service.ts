import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { MasterProfile } from '../../database/entities/master-profile.entity';
import { MasterSchedule } from '../../database/entities/master-schedule.entity';
import { MasterDayOff } from '../../database/entities/master-day-off.entity';
import { Booking } from '../../database/entities/booking.entity';
import { Service } from '../../database/entities/service.entity';
import { MasterService } from '../../database/entities/master-service.entity';
import { BookingStatus } from '../../common/enums/booking-status.enum';
import { SlotSuggestionDto } from './dto/suggest-slots-response.dto';

interface Weights {
  rating: number;
  availability: number;
  experience: number;
  load: number;
  specialization: number;
}

@Injectable()
export class SlotSuggesterService {
  private readonly weights: Weights;
  private readonly lookaheadDays: number;
  private readonly topSlots: number;

  constructor(
    @InjectRepository(MasterProfile)
    private readonly masterProfileRepo: Repository<MasterProfile>,
    @InjectRepository(MasterSchedule)
    private readonly scheduleRepo: Repository<MasterSchedule>,
    @InjectRepository(MasterDayOff)
    private readonly dayOffRepo: Repository<MasterDayOff>,
    @InjectRepository(Booking)
    private readonly bookingRepo: Repository<Booking>,
    @InjectRepository(Service)
    private readonly serviceRepo: Repository<Service>,
    @InjectRepository(MasterService)
    private readonly masterServiceRepo: Repository<MasterService>,
    private readonly configService: ConfigService,
  ) {
    this.weights = {
      rating: this.configService.get<number>('intelligence.weights.rating') ?? 0.35,
      availability: this.configService.get<number>('intelligence.weights.availability') ?? 0.25,
      experience: this.configService.get<number>('intelligence.weights.experience') ?? 0.20,
      load: this.configService.get<number>('intelligence.weights.load') ?? 0.10,
      specialization: this.configService.get<number>('intelligence.weights.specialization') ?? 0.10,
    };
    this.lookaheadDays = this.configService.get<number>('intelligence.lookaheadDays') ?? 14;
    this.topSlots = this.configService.get<number>('intelligence.topSlots') ?? 5;
  }

  async suggestSlots(
    serviceId: number,
    preferredDate: Date,
    estimatedMinutes: number,
    allServiceIds: number[] = [],
  ): Promise<SlotSuggestionDto[]> {
    const service = await this.serviceRepo.findOne({
      where: { id: serviceId },
      relations: ['category'],
    });
    if (!service) throw new NotFoundException(`Service ${serviceId} not found`);

    // Use all required service IDs for master eligibility filter;
    // fall back to the primary serviceId if not provided
    const effectiveServiceIds = allServiceIds.length > 0 ? allServiceIds : [serviceId];

    // Find masters who can perform ALL required services via master_services join
    const rawRows = await this.masterServiceRepo
      .createQueryBuilder('ms')
      .innerJoin('ms.master', 'mp')
      .innerJoin('ms.service', 'svc')
      .select('mp.id', 'mpId')
      .where('svc.id IN (:...effectiveServiceIds)', { effectiveServiceIds })
      .groupBy('mp.id')
      .having('COUNT(DISTINCT svc.id) = :count', { count: effectiveServiceIds.length })
      .getRawMany<{ mpId: number }>();

    if (!rawRows.length) return [];

    const eligibleIds = rawRows.map((r) => Number(r.mpId));

    // Load full master profiles with user data
    const masters = await this.masterProfileRepo.find({
      where: { id: In(eligibleIds) },
      relations: ['user'],
    });
    masters.forEach((m) => {
      if (m.user) {
        const u = m.user as unknown as Record<string, unknown>;
        delete u['passwordHash']; delete u['refreshTokenHash'];
        delete u['emailVerificationToken']; delete u['passwordResetToken'];
      }
    });
    const masterIds = masters.map((m) => m.id);

    const startDate = new Date(preferredDate);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + this.lookaheadDays);

    // Bulk-load all data upfront — no per-master queries
    const [allBookings, allDayOffs, allSchedules] = await Promise.all([
      this.bookingRepo
        .createQueryBuilder('b')
        .where('b.master IN (:...masterIds)', { masterIds })
        .andWhere('b.scheduledAt >= :startDate', { startDate })
        .andWhere('b.scheduledAt < :endDate', { endDate })
        .andWhere('b.status != :cancelled', { cancelled: BookingStatus.CANCELLED })
        .getMany(),
      this.dayOffRepo
        .createQueryBuilder('d')
        .innerJoinAndSelect('d.master', 'mp')
        .where('d.master IN (:...masterIds)', { masterIds })
        .andWhere('d.date >= :startStr', { startStr: this.toDateStr(startDate) })
        .andWhere('d.date <= :endStr', { endStr: this.toDateStr(endDate) })
        .getMany(),
      this.scheduleRepo
        .createQueryBuilder('s')
        .innerJoinAndSelect('s.master', 'mp')
        .where('s.master IN (:...masterIds)', { masterIds })
        .andWhere('s.isActive = true')
        .getMany(),
    ]);

    const slots: SlotSuggestionDto[] = [];

    for (const master of masters) {
      const schedules = allSchedules.filter((s) => s.master.id === master.id);
      const dayOffs = allDayOffs.filter((d) => d.master.id === master.id);
      const bookings = allBookings.filter((b) => (b as unknown as { masterId: number }).masterId === master.id);

      const loadScore = this.computeLoadScore(bookings.length, this.lookaheadDays);
      const ratingScore = Math.min(Number(master.rating ?? 0) / 5, 1);
      const experienceScore = Math.min((master.experienceYears ?? 0) / 10, 1);
      const specializationScore = this.computeSpecScore(
        master.specialization ?? '',
        service.category?.name ?? '',
      );

      const rawSlots = this.generateSlots(
        startDate,
        endDate,
        estimatedMinutes,
        schedules,
        dayOffs,
        bookings,
      );

      for (const raw of rawSlots) {
        const availabilityScore = this.computeAvailabilityScore(raw.startAt, startDate, endDate);
        const score = Math.min(
          1,
          this.weights.rating * ratingScore +
            this.weights.availability * availabilityScore +
            this.weights.experience * experienceScore +
            this.weights.load * loadScore +
            this.weights.specialization * specializationScore,
        );

        slots.push({
          masterId: master.id,
          masterName: `${master.user?.firstName ?? ''} ${master.user?.lastName ?? ''}`.trim(),
          startAt: raw.startAt.toISOString(),
          endAt: raw.endAt.toISOString(),
          score: Math.round(score * 1000) / 1000,
          reasons: this.buildReasons(
            ratingScore,
            availabilityScore,
            experienceScore,
            loadScore,
            specializationScore,
          ),
        });
      }
    }

    return slots.sort((a, b) => b.score - a.score).slice(0, this.topSlots);
  }

  private generateSlots(
    from: Date,
    to: Date,
    durationMin: number,
    schedules: MasterSchedule[],
    dayOffs: MasterDayOff[],
    bookings: Booking[],
  ): { startAt: Date; endAt: Date }[] {
    const result: { startAt: Date; endAt: Date }[] = [];
    const dayOffSet = new Set(dayOffs.map((d) => d.date.toString().slice(0, 10)));

    const current = new Date(from);
    while (current < to) {
      const dateStr = this.toDateStr(current);
      const appWeekday = (current.getDay() + 6) % 7; // Mon=0, Sun=6

      if (!dayOffSet.has(dateStr)) {
        const sched = schedules.find((s) => s.weekday === appWeekday);
        if (sched) {
          const [startH, startM] = sched.startTime.split(':').map(Number);
          const [endH, endM] = sched.endTime.split(':').map(Number);

          const dayStart = new Date(current);
          dayStart.setHours(startH, startM ?? 0, 0, 0);
          const dayEnd = new Date(current);
          dayEnd.setHours(endH, endM ?? 0, 0, 0);

          let slotStart = new Date(dayStart);
          while (slotStart.getTime() + durationMin * 60_000 <= dayEnd.getTime()) {
            const slotEnd = new Date(slotStart.getTime() + durationMin * 60_000);
            const overlap = bookings.some((b) => {
              const bStart = new Date(b.scheduledAt);
              const bEnd = new Date(bStart.getTime() + b.estimatedDurationMinutes * 60_000);
              return bStart < slotEnd && bEnd > slotStart;
            });
            if (!overlap) result.push({ startAt: new Date(slotStart), endAt: new Date(slotEnd) });
            slotStart = new Date(slotStart.getTime() + 30 * 60_000);
          }
        }
      }
      current.setDate(current.getDate() + 1);
    }
    return result;
  }

  private computeAvailabilityScore(slotDate: Date, from: Date, to: Date): number {
    const totalMs = to.getTime() - from.getTime();
    if (totalMs <= 0) return 1;
    return Math.max(0, 1 - (slotDate.getTime() - from.getTime()) / totalMs);
  }

  private computeLoadScore(bookingCount: number, days: number): number {
    const maxPerDay = 8;
    return Math.max(0, 1 - bookingCount / (maxPerDay * days));
  }

  private computeSpecScore(specialization: string, categoryName: string): number {
    if (!specialization || !categoryName) return 0.5;
    const keywords = categoryName.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
    return keywords.some((kw) => specialization.toLowerCase().includes(kw)) ? 1.0 : 0.5;
  }

  private buildReasons(
    rating: number,
    availability: number,
    experience: number,
    load: number,
    spec: number,
  ): string[] {
    return [
      `Рейтинг майстра: ${Math.round(rating * 100)}%`,
      `Доступність слоту: ${Math.round(availability * 100)}%`,
      `Досвід майстра: ${Math.round(experience * 100)}%`,
      `Завантаженість: ${Math.round(load * 100)}%`,
      `Відповідність спеціалізації: ${Math.round(spec * 100)}%`,
    ];
  }

  private toDateStr(d: Date): string {
    return d.toISOString().slice(0, 10);
  }
}
