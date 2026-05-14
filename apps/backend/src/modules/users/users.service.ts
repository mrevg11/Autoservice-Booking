import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../../database/entities/user.entity';
import { MasterProfile } from '../../database/entities/master-profile.entity';
import { Role } from '../../common/enums/role.enum';
import { UpdateUserDto } from './dto/update-user.dto';
import { AdminUpdateUserDto } from './dto/admin-update-user.dto';
import { UserResponseDto, toUserResponse } from './dto/user-response.dto';
import { PaginationDto, paginate, PaginatedResult } from '../../common/dto/pagination.dto';
import { RegisterDto } from '../auth/dto/register.dto';

const SALT_ROUNDS = 12;

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private usersRepo: Repository<User>,
    @InjectRepository(MasterProfile) private masterProfilesRepo: Repository<MasterProfile>,
  ) {}

  async getMe(userId: number): Promise<UserResponseDto> {
    const user = await this.findOneOrFail(userId);
    return toUserResponse(user);
  }

  async updateMe(userId: number, dto: UpdateUserDto): Promise<UserResponseDto> {
    const user = await this.findOneOrFail(userId);
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

  async adminUpdate(id: number, dto: AdminUpdateUserDto): Promise<UserResponseDto> {
    const user = await this.findOneOrFail(id);
    Object.assign(user, dto);
    await this.usersRepo.save(user);
    return toUserResponse(user);
  }

  async remove(id: number): Promise<{ message: string }> {
    const user = await this.findOneOrFail(id);
    await this.usersRepo.remove(user);
    return { message: `User ${id} deleted` };
  }

  async createMasterAccount(dto: RegisterDto): Promise<{ message: string }> {
    const existing = await this.usersRepo.findOne({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email already registered');

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

    await this.masterProfilesRepo.save(this.masterProfilesRepo.create({ user }));

    return { message: 'Master account created successfully.' };
  }

  private async findOneOrFail(id: number): Promise<User> {
    const user = await this.usersRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException(`User #${id} not found`);
    return user;
  }
}
