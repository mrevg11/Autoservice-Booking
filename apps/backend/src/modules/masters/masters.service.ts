import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
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

  async findAllForServices(serviceIds: number[]): Promise<PaginatedResult<MasterProfile>> {
    if (!serviceIds.length) return this.findAll({ page: 1, limit: 50 });

    // MasterProfile has no @OneToMany relation declared, so we query master_services directly
    const placeholders = serviceIds.map(() => '?').join(',');
    const rows = await this.dataSource.query<{ id: number }[]>(
      `SELECT ms.masterId AS id
       FROM master_services ms
       JOIN services s ON s.id = ms.serviceId
       WHERE s.id IN (${placeholders})
       GROUP BY ms.masterId
       HAVING COUNT(DISTINCT s.id) = ?`,
      [...serviceIds, serviceIds.length],
    );

    const ids = rows.map((r) => Number(r.id));
    if (!ids.length) return { data: [], total: 0, page: 1, limit: 50, totalPages: 0 };

    const data = await this.masterProfilesRepo.find({
      where: { id: In(ids) },
      relations: ['user'],
    });
    this.stripSensitiveFields(data);
    return { data, total: data.length, page: 1, limit: data.length || 50, totalPages: 1 };
  }

  async getWorkingDaysJs(masterId: number): Promise<number[]> {
    await this.ensureMasterExists(masterId);
    const schedules = await this.schedulesRepo.find({
      where: { master: { id: masterId }, isActive: true },
    });
    // Convert app weekday (Mon=0) to JS getDay() (Sun=0, Mon=1, ..., Sat=6)
    return schedules.map((s) => (s.weekday + 1) % 7);
  }

  async findOne(masterId: number): Promise<MasterProfile> {
    const master = await this.masterProfilesRepo.findOne({
      where: { id: masterId },
      relations: ['user'],
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
      const schedules = dtos.map((dto) => manager.create(MasterSchedule, { ...dto, master }));
      return manager.save(MasterSchedule, schedules);
    });
  }

  async setScheduleForMaster(
    masterId: number,
    dtos: CreateScheduleDto[],
  ): Promise<MasterSchedule[]> {
    await this.ensureMasterExists(masterId);
    const master = await this.masterProfilesRepo.findOne({ where: { id: masterId } });
    if (!master) throw new NotFoundException(`Master #${masterId} not found`);
    return this.dataSource.transaction(async (manager) => {
      await manager.delete(MasterSchedule, { master: { id: masterId } });
      const schedules = dtos.map((dto) => manager.create(MasterSchedule, { ...dto, master }));
      return manager.save(MasterSchedule, schedules);
    });
  }

  async getMySchedule(userId: number): Promise<MasterSchedule[]> {
    const master = await this.findMasterByUserId(userId);
    return this.schedulesRepo.find({
      where: { master: { id: master.id } },
      order: { weekday: 'ASC' },
    });
  }

  async getMyDaysOff(userId: number): Promise<MasterDayOff[]> {
    const master = await this.findMasterByUserId(userId);
    return this.daysOffRepo.find({
      where: { master: { id: master.id } },
      order: { date: 'ASC' },
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
    if (existing) throw new ConflictException('Ця послуга вже закріплена за майстром');

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
    vehicleId?: number,
  ): Promise<string[]> {
    await this.ensureMasterExists(masterId);

    // Convert date to weekday (app convention: Mon=0 … Sun=6)
    const dateObj = new Date(`${date}T00:00:00`);
    const jsDay = dateObj.getDay();
    const appWeekday = (jsDay + 6) % 7;

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

    const dayStart = new Date(`${date}T00:00:00`);
    const dayEnd = new Date(`${date}T23:59:59`);

    // 3. Bulk-load master bookings and (optionally) vehicle bookings for the day
    const dayQuery = (qb: ReturnType<typeof this.bookingsRepo.createQueryBuilder>) =>
      qb
        .andWhere('b.status != :cancelled', { cancelled: BookingStatus.CANCELLED })
        .andWhere('b.scheduledAt BETWEEN :start AND :end', { start: dayStart, end: dayEnd })
        .getMany();

    const [masterBookings, vehicleBookings]: [Booking[], Booking[]] = await Promise.all([
      dayQuery(
        this.bookingsRepo.createQueryBuilder('b').where('b.masterId = :masterId', { masterId }),
      ),
      vehicleId
        ? dayQuery(
            this.bookingsRepo
              .createQueryBuilder('b')
              .where('b.vehicleId = :vehicleId', { vehicleId }),
          )
        : Promise.resolve([]),
    ]);

    const isOccupied = (bookings: Booking[], slotTime: Date, slotEnd: Date) =>
      bookings.some((b) => {
        const bStart = new Date(b.scheduledAt);
        const dur = b.estimatedDurationMinutes > 0 ? b.estimatedDurationMinutes : 30;
        const bEnd = new Date(bStart.getTime() + dur * 60_000);
        return bStart < slotEnd && bEnd > slotTime;
      });

    // 4. Generate 30-min slots and filter
    const [sh, sm] = schedule.startTime.split(':').map(Number);
    const [eh, em] = schedule.endTime.split(':').map(Number);
    const startMin = sh * 60 + sm;
    const endMin = eh * 60 + em;
    const now = new Date();
    const slots: string[] = [];

    // UTC midnight of the requested date — used for DST-aware Kyiv→UTC conversion
    const utcMidnight = new Date(`${date}T00:00:00.000Z`);

    for (let m = startMin; m + durationMinutes <= endMin; m += 30) {
      const hh = Math.floor(m / 60);
      const mm = m % 60;

      // Convert schedule time (stored as Kyiv local) to UTC, honouring DST
      const slotTime = this.kyivTimeToUTC(utcMidnight, hh, mm);

      if (slotTime <= now) continue;

      const slotEnd = new Date(slotTime.getTime() + durationMinutes * 60_000);

      // Slot is free only if BOTH the master AND the vehicle are available
      if (
        !isOccupied(masterBookings, slotTime, slotEnd) &&
        !isOccupied(vehicleBookings, slotTime, slotEnd)
      ) {
        slots.push(`${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`);
      }
    }

    return slots;
  }

  // Converts a Kyiv local time (HH:MM, as stored in schedules) to a UTC Date.
  // Handles DST automatically: Kyiv is UTC+3 in summer, UTC+2 in winter.
  private kyivTimeToUTC(utcMidnight: Date, h: number, m: number): Date {
    const y = utcMidnight.getUTCFullYear();
    const mo = utcMidnight.getUTCMonth();
    const d = utcMidnight.getUTCDate();
    // First guess: summer time UTC+3
    const approx = new Date(Date.UTC(y, mo, d, h - 3, m, 0));
    const kyivH = Number(
      new Intl.DateTimeFormat('en', {
        timeZone: 'Europe/Kyiv',
        hour: '2-digit',
        hour12: false,
      }).format(approx),
    );
    if (kyivH !== h) {
      // Winter time UTC+2
      return new Date(Date.UTC(y, mo, d, h - 2, m, 0));
    }
    return approx;
  }

  private stripSensitiveFields(masters: MasterProfile[]): void {
    masters.forEach((m) => {
      if (m.user) {
        const u = m.user as unknown as Record<string, unknown>;
        delete u['passwordHash'];
        delete u['refreshTokenHash'];
        delete u['emailVerificationToken'];
        delete u['passwordResetToken'];
      }
    });
  }

  private async findMasterByUserId(userId: number): Promise<MasterProfile> {
    const master = await this.masterProfilesRepo.findOne({
      where: { user: { id: userId } },
      relations: ['user'],
    });
    if (!master) throw new NotFoundException('Профіль майстра не знайдено');
    return master;
  }

  private async ensureMasterExists(masterId: number): Promise<void> {
    const exists = await this.masterProfilesRepo.findOne({ where: { id: masterId } });
    if (!exists) throw new NotFoundException(`Master #${masterId} not found`);
  }
}
