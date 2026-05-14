import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  Optional,
  Inject,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, Between } from 'typeorm';
import { Booking } from '../../database/entities/booking.entity';
import { BookingService as BookingServiceEntity } from '../../database/entities/booking-service.entity';
import { BookingStatusHistory } from '../../database/entities/booking-status-history.entity';
import { MasterProfile } from '../../database/entities/master-profile.entity';
import { MasterService as MasterServiceEntity } from '../../database/entities/master-service.entity';
import { Service } from '../../database/entities/service.entity';
import { Vehicle } from '../../database/entities/vehicle.entity';
import { User } from '../../database/entities/user.entity';
import { BookingStatus } from '../../common/enums/booking-status.enum';
import { Role } from '../../common/enums/role.enum';
import { PaginationDto, paginate, PaginatedResult } from '../../common/dto/pagination.dto';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingStatusDto } from './dto/update-booking-status.dto';
import { BookingFilterDto } from './dto/booking-filter.dto';
import { NotificationsService } from '../notifications/notifications.service';

// Матриця дозволених переходів статусів
const STATUS_TRANSITIONS: Record<
  BookingStatus,
  { allowed: BookingStatus[]; roles: Role[] }
> = {
  [BookingStatus.PENDING]: {
    allowed: [BookingStatus.CONFIRMED, BookingStatus.CANCELLED],
    roles: [Role.ADMIN, Role.MASTER],
  },
  [BookingStatus.CONFIRMED]: {
    allowed: [BookingStatus.IN_PROGRESS, BookingStatus.CANCELLED],
    roles: [Role.ADMIN, Role.MASTER],
  },
  [BookingStatus.IN_PROGRESS]: {
    allowed: [BookingStatus.COMPLETED],
    roles: [Role.ADMIN, Role.MASTER],
  },
  [BookingStatus.COMPLETED]: { allowed: [], roles: [] },
  [BookingStatus.CANCELLED]: { allowed: [], roles: [] },
};

const CANCELLATION_DEADLINE_HOURS = 2;

@Injectable()
export class BookingsService {
  constructor(
    @InjectRepository(Booking)
    private bookingsRepo: Repository<Booking>,
    @InjectRepository(BookingServiceEntity)
    private bookingServicesRepo: Repository<BookingServiceEntity>,
    @InjectRepository(BookingStatusHistory)
    private historyRepo: Repository<BookingStatusHistory>,
    @InjectRepository(MasterProfile)
    private masterProfilesRepo: Repository<MasterProfile>,
    @InjectRepository(MasterServiceEntity)
    private masterServicesRepo: Repository<MasterServiceEntity>,
    @InjectRepository(Service)
    private servicesRepo: Repository<Service>,
    @InjectRepository(Vehicle)
    private vehiclesRepo: Repository<Vehicle>,
    private dataSource: DataSource,
    @Optional() @Inject(NotificationsService) private notificationsService: NotificationsService | undefined,
  ) {}

  async create(client: User, dto: CreateBookingDto): Promise<Booking> {
    const scheduledAt = new Date(dto.scheduledAt);
    if (scheduledAt <= new Date()) {
      throw new BadRequestException('Cannot book in the past');
    }

    // Validate master
    const master = await this.masterProfilesRepo.findOne({
      where: { id: dto.masterId },
    });
    if (!master) throw new NotFoundException(`Master #${dto.masterId} not found`);

    // Validate vehicle belongs to client
    const vehicle = await this.vehiclesRepo.findOne({
      where: { id: dto.vehicleId },
      relations: ['client'],
    });
    if (!vehicle) throw new NotFoundException(`Vehicle #${dto.vehicleId} not found`);
    if (vehicle.client.id !== client.id)
      throw new ForbiddenException('Vehicle does not belong to you');

    // Validate services and master assignments
    const services = await this.servicesRepo.findByIds(dto.serviceIds);
    if (services.length !== dto.serviceIds.length) {
      throw new NotFoundException('One or more services not found');
    }

    const masterServices = await this.masterServicesRepo.find({
      where: dto.serviceIds.map((sid) => ({
        master: { id: master.id },
        service: { id: sid },
      })),
      relations: ['service'],
    });

    if (masterServices.length !== dto.serviceIds.length) {
      throw new BadRequestException(
        'One or more services are not assigned to this master',
      );
    }

    // Calculate totals
    let totalPrice = 0;
    let estimatedDurationMinutes = 0;
    for (const ms of masterServices) {
      const svc = services.find((s) => s.id === ms.service.id);
      if (svc) {
        totalPrice += Number(svc.basePrice) * Number(ms.priceCoefficient);
        estimatedDurationMinutes += Math.round(
          svc.baseDurationMinutes * Number(ms.priceCoefficient),
        );
      }
    }
    totalPrice = Math.round(totalPrice * 100) / 100;

    return this.dataSource.transaction(async (manager) => {
      // Pessimistic write lock to prevent race conditions
      const overlapping = await manager
        .getRepository(Booking)
        .createQueryBuilder('b')
        .setLock('pessimistic_write')
        .where('b.masterId = :masterId', { masterId: master.id })
        .andWhere('b.status != :cancelled', { cancelled: BookingStatus.CANCELLED })
        .andWhere('b.scheduledAt < :newEnd', {
          newEnd: new Date(scheduledAt.getTime() + estimatedDurationMinutes * 60_000),
        })
        .andWhere(
          `DATE_ADD(b.scheduledAt, INTERVAL b.estimatedDurationMinutes MINUTE) > :newStart`,
          { newStart: scheduledAt },
        )
        .getMany();

      if (overlapping.length > 0) {
        throw new ConflictException('Time slot is already booked');
      }

      // Save booking
      const booking = manager.create(Booking, {
        client,
        master,
        vehicle,
        scheduledAt,
        estimatedDurationMinutes,
        totalPrice,
        status: BookingStatus.PENDING,
        notes: dto.notes ?? null,
      });
      const savedBooking = await manager.save(Booking, booking);

      // Save booking services
      const bsEntities = masterServices.map((ms) => {
        const svc = services.find((s) => s.id === ms.service.id)!;
        return manager.create(BookingServiceEntity, {
          booking: savedBooking,
          service: svc,
          actualPrice: Math.round(Number(svc.basePrice) * Number(ms.priceCoefficient) * 100) / 100,
          actualDurationMinutes: null,
        });
      });
      await manager.save(BookingServiceEntity, bsEntities);

      // Initial status history: null → PENDING
      const historyEntry = manager.create(BookingStatusHistory, {
        booking: savedBooking,
        oldStatus: null,
        newStatus: BookingStatus.PENDING,
        changedBy: client,
      });
      await manager.save(BookingStatusHistory, historyEntry);

      return savedBooking;
    });
  }

  async findAll(user: User, filters: BookingFilterDto): Promise<PaginatedResult<Booking>> {
    const { page = 1, limit = 20 } = filters;
    const qb = this.bookingsRepo
      .createQueryBuilder('b')
      .leftJoinAndSelect('b.client', 'client')
      .leftJoinAndSelect('b.master', 'master')
      .leftJoinAndSelect('master.user', 'masterUser')
      .leftJoinAndSelect('b.vehicle', 'vehicle')
      .orderBy('b.scheduledAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    // Role-based access
    if (user.role === Role.CLIENT) {
      qb.andWhere('client.id = :userId', { userId: user.id });
    } else if (user.role === Role.MASTER) {
      const master = await this.masterProfilesRepo.findOne({
        where: { user: { id: user.id } },
      });
      if (!master) return paginate([], 0, filters);
      qb.andWhere('master.id = :masterId', { masterId: master.id });
    }

    // Optional filters
    if (filters.status) {
      qb.andWhere('b.status = :status', { status: filters.status });
    }
    if (filters.masterId && user.role === Role.ADMIN) {
      qb.andWhere('master.id = :masterId', { masterId: filters.masterId });
    }
    if (filters.clientId && user.role === Role.ADMIN) {
      qb.andWhere('client.id = :clientId', { clientId: filters.clientId });
    }
    if (filters.from) {
      qb.andWhere('b.scheduledAt >= :from', { from: new Date(filters.from) });
    }
    if (filters.to) {
      qb.andWhere('b.scheduledAt <= :to', { to: new Date(`${filters.to}T23:59:59`) });
    }

    const [data, total] = await qb.getManyAndCount();
    this.stripSensitiveFields(data);
    return paginate(data, total, filters);
  }

  async findOne(id: number, user: User): Promise<Booking> {
    const booking = await this.bookingsRepo
      .createQueryBuilder('b')
      .leftJoinAndSelect('b.client', 'client')
      .leftJoinAndSelect('b.master', 'master')
      .leftJoinAndSelect('master.user', 'masterUser')
      .leftJoinAndSelect('b.vehicle', 'vehicle')
      .where('b.id = :id', { id })
      .getOne();

    if (!booking) throw new NotFoundException(`Booking #${id} not found`);
    this.checkBookingAccess(booking, user);
    this.stripSensitiveFields([booking]);
    return booking;
  }

  async updateStatus(
    id: number,
    user: User,
    dto: UpdateBookingStatusDto,
  ): Promise<Booking> {
    const booking = await this.bookingsRepo.findOne({
      where: { id },
      relations: ['client', 'master', 'master.user'],
    });
    if (!booking) throw new NotFoundException(`Booking #${id} not found`);

    const transition = STATUS_TRANSITIONS[booking.status];
    if (!transition.allowed.includes(dto.status)) {
      throw new BadRequestException(
        `Transition ${booking.status} → ${dto.status} is not allowed`,
      );
    }
    if (!transition.roles.includes(user.role)) {
      throw new ForbiddenException('You are not allowed to change this booking status');
    }

    const oldStatus = booking.status;
    booking.status = dto.status;
    await this.bookingsRepo.save(booking);

    const history = this.historyRepo.create({
      booking,
      oldStatus,
      newStatus: dto.status,
      changedBy: user,
    });
    await this.historyRepo.save(history);

    // Send notification (async, non-blocking)
    if (this.notificationsService) {
      const bookingWithRelations = await this.bookingsRepo.findOne({
        where: { id },
        relations: ['client', 'master', 'master.user', 'bookingServices', 'bookingServices.service'],
      });
      if (bookingWithRelations) {
        if (dto.status === BookingStatus.CONFIRMED) {
          void this.notificationsService.notifyBookingConfirmed(bookingWithRelations);
        } else if (dto.status === BookingStatus.CANCELLED) {
          void this.notificationsService.notifyBookingCancelled(bookingWithRelations);
        } else {
          void this.notificationsService.notifyStatusChanged(bookingWithRelations, dto.status);
        }
      }
    }

    return booking;
  }

  async cancel(id: number, client: User): Promise<Booking> {
    const booking = await this.bookingsRepo.findOne({
      where: { id },
      relations: ['client'],
    });
    if (!booking) throw new NotFoundException(`Booking #${id} not found`);

    if (booking.client.id !== client.id) {
      throw new ForbiddenException('You can only cancel your own bookings');
    }

    if (
      booking.status !== BookingStatus.PENDING &&
      booking.status !== BookingStatus.CONFIRMED
    ) {
      throw new BadRequestException(
        'Only PENDING or CONFIRMED bookings can be cancelled',
      );
    }

    const deadlineMs = CANCELLATION_DEADLINE_HOURS * 60 * 60 * 1000;
    if (new Date(booking.scheduledAt).getTime() - Date.now() < deadlineMs) {
      throw new BadRequestException(
        `Cannot cancel within ${CANCELLATION_DEADLINE_HOURS} hours of appointment`,
      );
    }

    const oldStatus = booking.status;
    booking.status = BookingStatus.CANCELLED;
    await this.bookingsRepo.save(booking);

    const history = this.historyRepo.create({
      booking,
      oldStatus,
      newStatus: BookingStatus.CANCELLED,
      changedBy: client,
    });
    await this.historyRepo.save(history);

    return booking;
  }

  async getHistory(id: number, user: User): Promise<BookingStatusHistory[]> {
    const booking = await this.bookingsRepo.findOne({
      where: { id },
      relations: ['client', 'master', 'master.user'],
    });
    if (!booking) throw new NotFoundException(`Booking #${id} not found`);
    this.checkBookingAccess(booking, user);

    return this.historyRepo.find({
      where: { booking: { id } },
      relations: ['changedBy'],
      order: { changedAt: 'ASC' },
    });
  }

  private checkBookingAccess(booking: Booking, user: User): void {
    if (user.role === Role.ADMIN) return;
    if (user.role === Role.CLIENT && booking.client.id !== user.id) {
      throw new ForbiddenException('Access denied');
    }
    if (
      user.role === Role.MASTER &&
      booking.master.user.id !== user.id
    ) {
      throw new ForbiddenException('Access denied');
    }
  }

  private stripSensitiveFields(bookings: Booking[]): void {
    for (const b of bookings) {
      if (b.client) {
        const u = b.client as unknown as Record<string, unknown>;
        delete u['passwordHash'];
        delete u['refreshTokenHash'];
        delete u['emailVerificationToken'];
        delete u['passwordResetToken'];
      }
      if (b.master?.user) {
        const u = b.master.user as unknown as Record<string, unknown>;
        delete u['passwordHash'];
        delete u['refreshTokenHash'];
        delete u['emailVerificationToken'];
        delete u['passwordResetToken'];
      }
    }
  }
}
