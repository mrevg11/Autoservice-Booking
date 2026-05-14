import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, Not } from 'typeorm';
import { MasterProfile } from '../../database/entities/master-profile.entity';
import { MasterSchedule } from '../../database/entities/master-schedule.entity';
import { MasterDayOff } from '../../database/entities/master-day-off.entity';
import { MasterService as MasterServiceEntity } from '../../database/entities/master-service.entity';
import { Service } from '../../database/entities/service.entity';
import { Booking } from '../../database/entities/booking.entity';
import { BookingStatus } from '../../common/enums/booking-status.enum';
import { PaginationDto, paginate, PaginatedResult } from '../../common/dto/pagination.dto';
import { UpdateMasterProfileDto } from './dto/update-master-profile.dto';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { CreateDayOffDto } from './dto/create-day-off.dto';
import { AssignServiceDto } from './dto/assign-service.dto';

@Injectable()
export class MastersService {
  constructor(
    @InjectRepository(MasterProfile)
    private masterProfilesRepo: Repository<MasterProfile>,
    @InjectRepository(MasterSchedule)
    private schedulesRepo: Repository<MasterSchedule>,
    @InjectRepository(MasterDayOff)
    private daysOffRepo: Repository<MasterDayOff>,
    @InjectRepository(MasterServiceEntity)
    private masterServicesRepo: Repository<MasterServiceEntity>,
    @InjectRepository(Service)
    private servicesRepo: Repository<Service>,
    @InjectRepository(Booking)
    private bookingsRepo: Repository<Booking>,
    private dataSource: DataSource,
  ) {}

  async findAll(pagination: PaginationDto): Promise<PaginatedResult<MasterProfile>> {
    const { page = 1, limit = 20 } = pagination;
    const [data, total] = await this.masterProfilesRepo.findAndCount({
      relations: ['user'],
      skip: (page - 1) * limit,
      take: limit,
    });
    // Strip passwordHash from user
    data.forEach((m) => {
      if (m.user) {
        const u = m.user as unknown as Record<string, unknown>;
        delete u['passwordHash'];
        delete u['refreshTokenHash'];
        delete u['emailVerificationToken'];
        delete u['passwordResetToken'];
      }
    });
    return paginate(data, total, pagination);
  }

  async findOne(masterId: number): Promise<MasterProfile> {
    const master = await this.masterProfilesRepo.findOne({
      where: { id: masterId },
      relations: ['user', 'masterServices', 'masterServices.service', 'masterSchedules'],
    });
    if (!master) throw new NotFoundException(`Master #${masterId} not found`);
    if (master.user) {
      const u = master.user as unknown as Record<string, unknown>;
      delete u['passwordHash'];
      delete u['refreshTokenHash'];
      delete u['emailVerificationToken'];
      delete u['passwordResetToken'];
    }
    return master;
  }

  async updateProfile(userId: number, dto: UpdateMasterProfileDto): Promise<MasterProfile> {
    const master = await this.findMasterByUserId(userId);
    Object.assign(master, dto);
    return this.masterProfilesRepo.save(master);
  }

  async getSchedule(masterId: number): Promise<MasterSchedule[]> {
    await this.ensureMasterExists(masterId);
    return this.schedulesRepo.find({
      where: { master: { id: masterId } },
      order: { weekday: 'ASC' },
    });
  }

  async setSchedule(userId: number, dtos: CreateScheduleDto[]): Promise<MasterSchedule[]> {
    const master = await this.findMasterByUserId(userId);

    return this.dataSource.transaction(async (manager) => {
      await manager.delete(MasterSchedule, { master: { id: master.id } });
      const schedules = dtos.map((dto) =>
        manager.create(MasterSchedule, { ...dto, master }),
      );
      return manager.save(MasterSchedule, schedules);
    });
  }

  async setScheduleForMaster(masterId: number, dtos: CreateScheduleDto[]): Promise<MasterSchedule[]> {
    await this.ensureMasterExists(masterId);
    const master = await this.masterProfilesRepo.findOne({ where: { id: masterId } });
    if (!master) throw new NotFoundException(`Master #${masterId} not found`);
    return this.dataSource.transaction(async (manager) => {
      await manager.delete(MasterSchedule, { master: { id: masterId } });
      const schedules = dtos.map((dto) => manager.create(MasterSchedule, { ...dto, master }));
      return manager.save(MasterSchedule, schedules);
    });
  }

  async addDayOff(userId: number, dto: CreateDayOffDto): Promise<MasterDayOff> {
    const master = await this.findMasterByUserId(userId);
    const dayOff = this.daysOffRepo.create({ ...dto, master });
    return this.daysOffRepo.save(dayOff);
  }

  async removeDayOff(userId: number, dayOffId: number): Promise<{ message: string }> {
    const master = await this.findMasterByUserId(userId);
    const dayOff = await this.daysOffRepo.findOne({
      where: { id: dayOffId, master: { id: master.id } },
    });
    if (!dayOff) throw new NotFoundException(`Day-off #${dayOffId} not found`);
    await this.daysOffRepo.remove(dayOff);
    return { message: `Day-off #${dayOffId} removed` };
  }

  async assignService(userId: number, dto: AssignServiceDto): Promise<MasterServiceEntity> {
    const master = await this.findMasterByUserId(userId);
    const service = await this.servicesRepo.findOne({ where: { id: dto.serviceId } });
    if (!service) throw new NotFoundException(`Service #${dto.serviceId} not found`);

    const existing = await this.masterServicesRepo.findOne({
      where: { master: { id: master.id }, service: { id: service.id } },
    });
    if (existing) throw new ConflictException('Service already assigned to this master');

    const masterService = this.masterServicesRepo.create({
      master,
      service,
      priceCoefficient: dto.priceCoefficient ?? 1.0,
    });
    return this.masterServicesRepo.save(masterService);
  }

  async removeService(userId: number, serviceId: number): Promise<{ message: string }> {
    const master = await this.findMasterByUserId(userId);
    const masterService = await this.masterServicesRepo.findOne({
      where: { master: { id: master.id }, service: { id: serviceId } },
    });
    if (!masterService)
      throw new NotFoundException(`Service #${serviceId} not assigned to this master`);
    await this.masterServicesRepo.remove(masterService);
    return { message: `Service #${serviceId} removed from master` };
  }

  async getAvailableSlots(
    masterId: number,
    date: string,
    durationMinutes: number,
  ): Promise<string[]> {
    await this.ensureMasterExists(masterId);

    // Convert date to weekday (app convention: Mon=0 … Sun=6)
    const dateObj = new Date(`${date}T00:00:00`);
    const jsDay = dateObj.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
    const appWeekday = (jsDay + 6) % 7; // Mon=0, Sun=6

    // 1. Check for day-off
    const dayOff = await this.daysOffRepo.findOne({
      where: { master: { id: masterId }, date },
    });
    if (dayOff) return [];

    // 2. Get schedule for this weekday
    const schedule = await this.schedulesRepo.findOne({
      where: { master: { id: masterId }, weekday: appWeekday, isActive: true },
    });
    if (!schedule) return [];

    // 3. Get existing non-cancelled bookings on this date
    const dayStart = new Date(`${date}T00:00:00`);
    const dayEnd = new Date(`${date}T23:59:59`);
    const existingBookings = await this.bookingsRepo
      .createQueryBuilder('b')
      .where('b.masterId = :masterId', { masterId })
      .andWhere('b.status != :cancelled', { cancelled: BookingStatus.CANCELLED })
      .andWhere('b.scheduledAt BETWEEN :start AND :end', { start: dayStart, end: dayEnd })
      .getMany();

    // 4. Generate 30-min slots and filter
    const [sh, sm] = schedule.startTime.split(':').map(Number);
    const [eh, em] = schedule.endTime.split(':').map(Number);
    const startMin = sh * 60 + sm;
    const endMin = eh * 60 + em;
    const now = new Date();
    const slots: string[] = [];

    for (let m = startMin; m + durationMinutes <= endMin; m += 30) {
      const hh = Math.floor(m / 60);
      const mm = m % 60;
      const slotTime = new Date(`${date}T${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:00`);

      // Skip past slots
      if (slotTime <= now) continue;

      const slotEnd = new Date(slotTime.getTime() + durationMinutes * 60_000);

      // Check overlap with existing bookings
      const occupied = existingBookings.some((b) => {
        const bookingEnd = new Date(
          new Date(b.scheduledAt).getTime() + b.estimatedDurationMinutes * 60_000,
        );
        return new Date(b.scheduledAt) < slotEnd && bookingEnd > slotTime;
      });

      if (!occupied) {
        slots.push(`${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`);
      }
    }

    return slots;
  }

  private async findMasterByUserId(userId: number): Promise<MasterProfile> {
    const master = await this.masterProfilesRepo.findOne({
      where: { user: { id: userId } },
      relations: ['user'],
    });
    if (!master) throw new NotFoundException('Master profile not found for this user');
    return master;
  }

  private async ensureMasterExists(masterId: number): Promise<void> {
    const exists = await this.masterProfilesRepo.findOne({ where: { id: masterId } });
    if (!exists) throw new NotFoundException(`Master #${masterId} not found`);
  }
}
