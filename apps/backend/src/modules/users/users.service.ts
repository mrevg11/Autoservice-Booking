import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { User } from '../../database/entities/user.entity';
import { MasterProfile } from '../../database/entities/master-profile.entity';
import { MasterSchedule } from '../../database/entities/master-schedule.entity';
import { Booking } from '../../database/entities/booking.entity';
import { Vehicle } from '../../database/entities/vehicle.entity';
import { BookingStatus } from '../../common/enums/booking-status.enum';
import { Role } from '../../common/enums/role.enum';
import { UpdateUserDto } from './dto/update-user.dto';
import { AdminUpdateUserDto } from './dto/admin-update-user.dto';
import { UserResponseDto, toUserResponse } from './dto/user-response.dto';
import { PaginationDto, paginate, PaginatedResult } from '../../common/dto/pagination.dto';
import { RegisterDto } from '../auth/dto/register.dto';
import { MailService } from '../mail/mail.service';

const SALT_ROUNDS = 12;

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private usersRepo: Repository<User>,
    @InjectRepository(MasterProfile) private masterProfilesRepo: Repository<MasterProfile>,
    @InjectRepository(MasterSchedule) private schedulesRepo: Repository<MasterSchedule>,
    @InjectRepository(Booking) private bookingsRepo: Repository<Booking>,
    @InjectRepository(Vehicle) private vehiclesRepo: Repository<Vehicle>,
    private mailService: MailService,
  ) {}

  async getMe(userId: number): Promise<UserResponseDto> {
    const user = await this.findOneOrFail(userId);
    return toUserResponse(user);
  }

  async updateMe(userId: number, dto: UpdateUserDto): Promise<UserResponseDto> {
    const user = await this.findOneOrFail(userId);
    if (dto.email && dto.email !== user.email) {
      const existing = await this.usersRepo.findOne({ where: { email: dto.email } });
      if (existing) throw new ConflictException('Цей email вже використовується');
      user.emailVerified = false;
    }
    Object.assign(user, dto);
    await this.usersRepo.save(user);
    return toUserResponse(user);
  }

  async findAll(pagination: PaginationDto): Promise<PaginatedResult<UserResponseDto>> {
    const { page = 1, limit = 20 } = pagination;
    const [users, total] = await this.usersRepo.findAndCount({
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return paginate(users.map(toUserResponse), total, pagination);
  }

  async findOne(id: number): Promise<UserResponseDto> {
    const user = await this.findOneOrFail(id);
    return toUserResponse(user);
  }

  async findOneForAdmin(id: number) {
    const user = await this.findOneOrFail(id);
    const [vehiclesCount, bookingsCount, masterProfile] = await Promise.all([
      this.vehiclesRepo.count({ where: { client: { id } } }),
      this.bookingsRepo.count({ where: { client: { id } } }),
      this.masterProfilesRepo.findOne({ where: { user: { id } } }),
    ]);
    return {
      ...toUserResponse(user),
      vehiclesCount,
      bookingsCount,
      masterProfile: masterProfile
        ? { experienceYears: masterProfile.experienceYears, rating: masterProfile.rating }
        : null,
    };
  }

  async adminUpdate(id: number, dto: AdminUpdateUserDto): Promise<UserResponseDto> {
    const user = await this.findOneOrFail(id);
    const wasBlocked = user.isBlocked;
    Object.assign(user, dto);
    await this.usersRepo.save(user);

    if (dto.isBlocked && !wasBlocked) {
      await this.bookingsRepo.update(
        {
          client: { id },
          status: In([BookingStatus.PENDING, BookingStatus.CONFIRMED, BookingStatus.IN_PROGRESS]),
        },
        { status: BookingStatus.CANCELLED },
      );
    }

    return toUserResponse(user);
  }

  async remove(id: number): Promise<{ message: string }> {
    await this.findOneOrFail(id);

    // Delete all client bookings (cascades: booking_services, photos, status_history, reviews)
    await this.bookingsRepo
      .createQueryBuilder()
      .delete()
      .from(Booking)
      .where('clientId = :id', { id })
      .execute();

    // Delete vehicles (booking.vehicle SET NULL handled by DB)
    await this.vehiclesRepo.delete({ client: { id } });

    // Delete user — DB CASCADE handles client_profile, master_profile, notifications
    await this.usersRepo.delete(id);

    return { message: `User ${id} deleted` };
  }

  async createMasterAccount(dto: RegisterDto): Promise<{ message: string }> {
    const existing = await this.usersRepo.findOne({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Цей email вже зареєстровано');

    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);

    const user = this.usersRepo.create({
      email: dto.email,
      passwordHash,
      firstName: dto.firstName,
      lastName: dto.lastName,
      phone: dto.phone ?? null,
      role: Role.MASTER,
      emailVerified: true,
    });
    await this.usersRepo.save(user);

    const masterProfile = await this.masterProfilesRepo.save(
      this.masterProfilesRepo.create({ user }),
    );

    // Default schedule: Mon–Fri 09:00–18:00 active, Sat–Sun inactive
    const defaultSchedule = Array.from({ length: 7 }, (_, weekday) =>
      this.schedulesRepo.create({
        master: masterProfile,
        weekday,
        startTime: '09:00',
        endTime: '18:00',
        isActive: weekday < 5,
      }),
    );
    await this.schedulesRepo.save(defaultSchedule);

    return { message: 'Master account created successfully.' };
  }

  async resendVerificationEmail(id: number): Promise<{ message: string }> {
    const user = await this.findOneOrFail(id);
    if (user.emailVerified) throw new BadRequestException('Email вже верифіковано');

    const rawToken = crypto.randomBytes(32).toString('hex');
    const expires = new Date();
    expires.setHours(expires.getHours() + 24);
    user.emailVerificationToken = crypto.createHash('sha256').update(rawToken).digest('hex');
    user.emailVerificationExpires = expires;
    await this.usersRepo.save(user);

    this.mailService
      .sendEmailVerification(user.email, rawToken, user.firstName)
      .catch(() => undefined);

    return { message: 'Лист верифікації надіслано' };
  }

  private async findOneOrFail(id: number): Promise<User> {
    const user = await this.usersRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException(`User #${id} not found`);
    return user;
  }
}
