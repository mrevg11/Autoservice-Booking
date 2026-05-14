import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Service } from '../../database/entities/service.entity';
import { BookingService as BookingServiceEntity } from '../../database/entities/booking-service.entity';
import { BookingStatus } from '../../common/enums/booking-status.enum';
import { DurationEstimateResponseDto } from './dto/duration-estimate-response.dto';

@Injectable()
export class DurationPredictorService {
  private readonly minDataPoints: number;

  constructor(
    @InjectRepository(Service)
    private readonly serviceRepo: Repository<Service>,
    @InjectRepository(BookingServiceEntity)
    private readonly bookingServiceRepo: Repository<BookingServiceEntity>,
    private readonly configService: ConfigService,
  ) {
    this.minDataPoints = this.configService.get<number>('intelligence.minDataPoints') ?? 5;
  }

  async predict(
    serviceId: number,
    masterId?: number,
    vehicleYear?: number,
  ): Promise<DurationEstimateResponseDto> {
    const service = await this.serviceRepo.findOne({ where: { id: serviceId } });
    if (!service) throw new NotFoundException(`Service ${serviceId} not found`);

    const masterCoeff = masterId && masterId > 0
      ? await this.computeMasterCoeff(masterId, serviceId, service.baseDurationMinutes)
      : 1.0;
    const vehicleAgeCoeff = vehicleYear !== undefined
      ? this.computeVehicleAgeCoeff(vehicleYear)
      : 1.0;
    const seasonCoeff = this.computeSeasonCoeff(new Date());

    const estimatedMinutes = Math.round(
      service.baseDurationMinutes * masterCoeff * vehicleAgeCoeff * seasonCoeff,
    );

    return {
      serviceId,
      masterId: masterId ?? 0,
      estimatedMinutes,
      baseDurationMinutes: service.baseDurationMinutes,
      masterCoeff: Math.round(masterCoeff * 100) / 100,
      vehicleAgeCoeff: Math.round(vehicleAgeCoeff * 100) / 100,
      seasonCoeff: Math.round(seasonCoeff * 100) / 100,
    };
  }

  private async computeMasterCoeff(
    masterId: number,
    serviceId: number,
    baseDuration: number,
  ): Promise<number> {
    if (baseDuration === 0) return 1.0;

    const rows = await this.bookingServiceRepo
      .createQueryBuilder('bs')
      .innerJoin('bs.booking', 'b')
      .where('b.master = :masterId', { masterId })
      .andWhere('bs.service = :serviceId', { serviceId })
      .andWhere('bs.actualDurationMinutes IS NOT NULL')
      .andWhere('b.status = :status', { status: BookingStatus.COMPLETED })
      .select('bs.actualDurationMinutes', 'dur')
      .getRawMany<{ dur: number }>();

    if (rows.length < this.minDataPoints) return 1.0;

    const avg = rows.reduce((sum, r) => sum + Number(r.dur), 0) / rows.length;
    const coeff = avg / baseDuration;
    // Clamp to [0.5..2.0]
    return Math.max(0.5, Math.min(2.0, coeff));
  }

  private computeVehicleAgeCoeff(vehicleYear: number): number {
    const age = new Date().getFullYear() - vehicleYear;
    if (age <= 3) return 0.95;
    if (age <= 7) return 1.0;
    if (age <= 12) return 1.1;
    if (age <= 20) return 1.2;
    return 1.35;
  }

  private computeSeasonCoeff(date: Date): number {
    const month = date.getMonth() + 1;
    if (month === 12 || month <= 2) return 1.1;  // winter
    if (month >= 6 && month <= 8) return 0.95;   // summer
    return 1.0;
  }
}
