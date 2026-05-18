import {
  Injectable,
  BadRequestException,
  Logger,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  Optional,
  Inject,
} from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, Between, LessThan } from 'typeorm';
import { Booking } from '../../database/entities/booking.entity';
import { BookingService as BookingServiceEntity } from '../../database/entities/booking-service.entity';
import { BookingStatusHistory } from '../../database/entities/booking-status-history.entity';
import { BookingPhoto } from '../../database/entities/booking-photo.entity';
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
import { CreateBookingPhotoDto } from './dto/create-booking-photo.dto';
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
  private readonly logger = new Logger(BookingsService.name);

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
    @InjectRepository(BookingPhoto)
    private bookingPhotosRepo: Repository<BookingPhoto>,
    private dataSource: DataSource,
    @Optional() @Inject(NotificationsService) private notificationsService: NotificationsService | undefined,
  ) {}

  async create(client: User, dto: CreateBookingDto): Promise<Booking> {
    const scheduledAt = new Date(dto.scheduledAt);
    if (scheduledAt <= new Date()) {
      throw new BadRequestException('Не можна записатись на минулий час');
    }

    // Validate master
    const master = await this.masterProfilesRepo.findOne({
      where: { id: dto.masterId },
    });
    if (!master) throw new NotFoundException("Майстра не знайдено");

    // Validate vehicle belongs to client
    const vehicle = await this.vehiclesRepo.findOne({
      where: { id: dto.vehicleId },
      relations: ['client'],
    });
    if (!vehicle) throw new NotFoundException("Автомобіль не знайдено");
    if (vehicle.client.id !== client.id)
      throw new ForbiddenException('Цей автомобіль не належить вам');

    // Validate services and master assignments
    const services = await this.servicesRepo.findByIds(dto.serviceIds);
    if (services.length !== dto.serviceIds.length) {
      throw new NotFoundException('Одну або кілька послуг не знайдено');
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
        'Одна або кілька послуг не закріплені за цим майстром',
      );
    }

    // Calculate totals
    let totalPrice = 0;
    let estimatedDurationMinutes = 0;
    for (const ms of masterServices) {
      const svc = services.find((s) => s.id === ms.service.id);
      if (svc) {
        totalPrice += Number(svc.basePrice) * Number(ms.priceCoefficient);
        estimatedDurationMinutes += svc.baseDurationMinutes;
      }
    }
    totalPrice = Math.round(totalPrice * 100) / 100;

    return this.dataSource.transaction(async (manager) => {
      // Lock the master profile row first — serialises all concurrent booking
      // attempts for this master so the empty-result SELECT FOR UPDATE loophole
      // (no rows to lock when calendar is free) cannot cause double-booking.
      const lockedMaster = await manager
        .getRepository(MasterProfile)
        .createQueryBuilder('mp')
        .setLock('pessimistic_write')
        .where('mp.id = :masterId', { masterId: master.id })
        .getOne();

      if (!lockedMaster) throw new NotFoundException('Майстра не знайдено');

      // Check for overlapping bookings (now safe: master row is locked)
      const newEnd = new Date(scheduledAt.getTime() + estimatedDurationMinutes * 60_000);
      const overlapping = await manager
        .getRepository(Booking)
        .createQueryBuilder('b')
        .where('b.masterId = :masterId', { masterId: master.id })
        .andWhere('b.status != :cancelled', { cancelled: BookingStatus.CANCELLED })
        .andWhere('b.scheduledAt < :newEnd', { newEnd })
        .andWhere(
          `DATE_ADD(b.scheduledAt, INTERVAL b.estimatedDurationMinutes MINUTE) > :newStart`,
          { newStart: scheduledAt },
        )
        .getMany();

      if (overlapping.length > 0) {
        throw new ConflictException('Цей час вже зайнятий');
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
      .leftJoinAndSelect('b.bookingServices', 'bookingServices')
      .leftJoinAndSelect('bookingServices.service', 'bsService')
      .where('b.id = :id', { id })
      .getOne();

    if (!booking) throw new NotFoundException("Запис не знайдено");
    this.checkBookingAccess(booking, user);
    this.stripSensitiveFields([booking]);
    return booking;
  }

  async updateStatus(
    id: number,
    user: User,
    dto: UpdateBookingStatusDto,
  ): Promise<Booking> {
    const updatedBooking = await this.dataSource.transaction(async (manager) => {
      const booking = await manager
        .getRepository(Booking)
        .createQueryBuilder('b')
        .setLock('pessimistic_write')
        .leftJoinAndSelect('b.client', 'client')
        .leftJoinAndSelect('b.master', 'master')
        .leftJoinAndSelect('master.user', 'masterUser')
        .where('b.id = :id', { id })
        .getOne();

      if (!booking) throw new NotFoundException('Запис не знайдено');

      const transition = STATUS_TRANSITIONS[booking.status];
      if (!transition.allowed.includes(dto.status)) {
        throw new BadRequestException(
          `Перехід статусу ${booking.status} → ${dto.status} не дозволений`,
        );
      }
      if (!transition.roles.includes(user.role)) {
        throw new ForbiddenException('У вас немає прав для зміни цього статусу');
      }

      const oldStatus = booking.status;
      booking.status = dto.status;
      const saved = await manager.save(Booking, booking);

      await manager.save(
        BookingStatusHistory,
        manager.create(BookingStatusHistory, {
          booking: saved,
          oldStatus,
          newStatus: dto.status,
          changedBy: user,
        }),
      );

      return saved;
    });

    // Send notification outside the transaction (non-blocking, failure is acceptable)
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

    return updatedBooking;
  }

  async cancel(id: number, client: User): Promise<Booking> {
    return this.dataSource.transaction(async (manager) => {
      // Pessimistic lock prevents concurrent cancel + status-change on the same booking
      const booking = await manager
        .getRepository(Booking)
        .createQueryBuilder('b')
        .setLock('pessimistic_write')
        .leftJoinAndSelect('b.client', 'client')
        .where('b.id = :id', { id })
        .getOne();

      if (!booking) throw new NotFoundException('Запис не знайдено');

      if (booking.client?.id !== client.id) {
        throw new ForbiddenException('Ви можете скасувати лише власні записи');
      }

      if (
        booking.status !== BookingStatus.PENDING &&
        booking.status !== BookingStatus.CONFIRMED
      ) {
        throw new BadRequestException(
          'Скасувати можна лише записи зі статусом PENDING або CONFIRMED',
        );
      }

      const deadlineMs = CANCELLATION_DEADLINE_HOURS * 60 * 60 * 1000;
      if (new Date(booking.scheduledAt).getTime() - Date.now() < deadlineMs) {
        throw new BadRequestException(
          `Скасування неможливе менш ніж за ${CANCELLATION_DEADLINE_HOURS} год до прийому`,
        );
      }

      const oldStatus = booking.status;
      booking.status = BookingStatus.CANCELLED;
      const saved = await manager.save(Booking, booking);

      await manager.save(
        BookingStatusHistory,
        manager.create(BookingStatusHistory, {
          booking: saved,
          oldStatus,
          newStatus: BookingStatus.CANCELLED,
          changedBy: client,
        }),
      );

      return saved;
    });
  }

  @Cron('0 * * * *')
  async cancelExpiredBookings(): Promise<void> {
    const now = new Date();
    const expired = await this.bookingsRepo.find({
      where: [
        { status: BookingStatus.PENDING, scheduledAt: LessThan(now) },
        { status: BookingStatus.CONFIRMED, scheduledAt: LessThan(now) },
      ],
    });

    for (const booking of expired) {
      try {
        await this.dataSource.transaction(async (manager) => {
          // Re-read with lock to guard against concurrent status changes
          const current = await manager
            .getRepository(Booking)
            .createQueryBuilder('b')
            .setLock('pessimistic_write')
            .where('b.id = :id', { id: booking.id })
            .getOne();

          // Skip if already changed by another process
          if (!current || current.status === BookingStatus.CANCELLED ||
              current.status === BookingStatus.COMPLETED) {
            return;
          }

          const oldStatus = current.status;
          current.status = BookingStatus.CANCELLED;
          const saved = await manager.save(Booking, current);

          await manager.save(
            BookingStatusHistory,
            manager.create(BookingStatusHistory, {
              booking: saved,
              oldStatus,
              newStatus: BookingStatus.CANCELLED,
              changedBy: null,
            }),
          );
        });
      } catch (err) {
        this.logger.error(`Failed to cancel expired booking #${booking.id}`, err instanceof Error ? err.stack : String(err));
      }
    }
  }

  async forceDelete(id: number): Promise<{ message: string }> {
    const booking = await this.bookingsRepo.findOne({ where: { id } });
    if (!booking) throw new NotFoundException('Запис не знайдено');
    // booking_services and booking_status_history have onDelete: CASCADE in the DB
    await this.bookingsRepo.remove(booking);
    return { message: 'Запис повністю видалено' };
  }

  async getHistory(id: number, user: User): Promise<BookingStatusHistory[]> {
    const booking = await this.bookingsRepo.findOne({
      where: { id },
      relations: ['client', 'master', 'master.user'],
    });
    if (!booking) throw new NotFoundException("Запис не знайдено");
    this.checkBookingAccess(booking, user);

    const history = await this.historyRepo.find({
      where: { booking: { id } },
      relations: ['changedBy'],
      order: { changedAt: 'ASC' },
    });
    for (const entry of history) {
      if (entry.changedBy) {
        const u = entry.changedBy as unknown as Record<string, unknown>;
        delete u['passwordHash'];
        delete u['refreshTokenHash'];
        delete u['emailVerificationToken'];
        delete u['passwordResetToken'];
      }
    }
    return history;
  }

  async getPhotos(bookingId: number, user: User): Promise<BookingPhoto[]> {
    const booking = await this.bookingsRepo.findOne({
      where: { id: bookingId },
      relations: ['client', 'master', 'master.user'],
    });
    if (!booking) throw new NotFoundException('Запис не знайдено');
    this.checkBookingAccess(booking, user);

    const photos = await this.bookingPhotosRepo.find({
      where: { booking: { id: bookingId } },
      relations: ['uploadedBy'],
      order: { createdAt: 'ASC' },
    });
    for (const p of photos) {
      if (p.uploadedBy) this.stripUser(p.uploadedBy);
    }
    return photos;
  }

  async addPhoto(bookingId: number, user: User, dto: CreateBookingPhotoDto): Promise<BookingPhoto> {
    const booking = await this.bookingsRepo.findOne({
      where: { id: bookingId },
      relations: ['client', 'master', 'master.user'],
    });
    if (!booking) throw new NotFoundException('Запис не знайдено');
    this.checkBookingAccess(booking, user);

    if (!dto.dataUrl.startsWith('data:image/')) {
      throw new BadRequestException('Невірний формат зображення');
    }
    if (dto.dataUrl.length > 7_000_000) {
      throw new BadRequestException('Зображення занадто велике (максимум 5 МБ)');
    }

    const photo = this.bookingPhotosRepo.create({
      booking: { id: bookingId } as Booking,
      uploadedBy: user,
      dataUrl: dto.dataUrl,
      mimeType: dto.mimeType,
      caption: dto.caption ?? null,
    });
    const saved = await this.bookingPhotosRepo.save(photo);
    const result = await this.bookingPhotosRepo.findOne({
      where: { id: saved.id },
      relations: ['uploadedBy'],
    });
    if (result?.uploadedBy) this.stripUser(result.uploadedBy);
    return result!;
  }

  async deletePhoto(bookingId: number, photoId: number, user: User): Promise<void> {
    const photo = await this.bookingPhotosRepo.findOne({
      where: { id: photoId, booking: { id: bookingId } },
      relations: ['uploadedBy'],
    });
    if (!photo) throw new NotFoundException('Фото не знайдено');

    const isOwner = photo.uploadedBy?.id === user.id;
    const isAdmin = user.role === Role.ADMIN;
    if (!isOwner && !isAdmin) throw new ForbiddenException('Ви не можете видалити це фото');

    await this.bookingPhotosRepo.remove(photo);
  }

  private stripUser(u: User): void {
    const rec = u as unknown as Record<string, unknown>;
    delete rec['passwordHash'];
    delete rec['refreshTokenHash'];
    delete rec['emailVerificationToken'];
    delete rec['passwordResetToken'];
  }

  private checkBookingAccess(booking: Booking, user: User): void {
    if (user.role === Role.ADMIN) return;
    if (user.role === Role.CLIENT && booking.client?.id !== user.id) {
      throw new ForbiddenException('Доступ заборонено');
    }
    if (
      user.role === Role.MASTER &&
      booking.master.user.id !== user.id
    ) {
      throw new ForbiddenException('Доступ заборонено');
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
