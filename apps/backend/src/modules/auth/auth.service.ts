import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { User } from '../../database/entities/user.entity';
import { ClientProfile } from '../../database/entities/client-profile.entity';
import { MasterProfile } from '../../database/entities/master-profile.entity';
import { Role } from '../../common/enums/role.enum';
import { MailService } from '../mail/mail.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { JwtPayload } from './strategies/jwt.strategy';

const SALT_ROUNDS = 12;
const RESET_EXPIRES_HOURS = 1;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User) private usersRepo: Repository<User>,
    @InjectRepository(ClientProfile) private profilesRepo: Repository<ClientProfile>,
    @InjectRepository(MasterProfile) private masterProfilesRepo: Repository<MasterProfile>,
    private jwtService: JwtService,
    private config: ConfigService,
    private mailService: MailService,
  ) {}

  async register(dto: RegisterDto): Promise<{ message: string }> {
    const existing = await this.usersRepo.findOne({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Цей email вже зареєстровано');

    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
    const emailVerificationToken = crypto.randomBytes(32).toString('hex');

    const user = this.usersRepo.create({
      email: dto.email,
      passwordHash,
      firstName: dto.firstName,
      lastName: dto.lastName,
      phone: dto.phone ?? null,
      role: Role.CLIENT,
      emailVerified: false,
      emailVerificationToken,
    });
    await this.usersRepo.save(user);

    const profile = this.profilesRepo.create({ user });
    await this.profilesRepo.save(profile);

    await this.mailService.sendEmailVerification(user.email, emailVerificationToken);

    this.logger.log(`New user registered: ${user.email}`);
    return { message: 'Registration successful. Please verify your email.' };
  }

  async registerMaster(dto: RegisterDto): Promise<{ message: string }> {
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
      emailVerified: true, // Admin-created accounts are pre-verified
    });
    await this.usersRepo.save(user);

    await this.masterProfilesRepo.save(this.masterProfilesRepo.create({ user }));

    this.logger.log(`Master account created by admin: ${user.email}`);
    return { message: 'Master account created successfully.' };
  }

  async verifyEmail(token: string): Promise<{ message: string }> {
    const user = await this.usersRepo.findOne({
      where: { emailVerificationToken: token },
    });
    if (!user) throw new BadRequestException('Недійсний або прострочений токен підтвердження');

    user.emailVerified = true;
    user.emailVerificationToken = null;
    await this.usersRepo.save(user);

    return { message: 'Email verified successfully' };
  }

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.usersRepo.findOne({ where: { email: dto.email } });

    // Однакова помилка для "не знайдено" і "неправильний пароль" — захист від enumeration
    const isValid = user && (await bcrypt.compare(dto.password, user.passwordHash));
    if (!isValid) throw new UnauthorizedException('Невірний email або пароль');

    if (user.isBlocked) throw new UnauthorizedException('Обліковий запис заблоковано');

    const tokens = await this.generateTokens(user);

    user.refreshTokenHash = await bcrypt.hash(tokens.refreshToken, SALT_ROUNDS);
    await this.usersRepo.save(user);

    this.logger.log(`User logged in: ${user.email}`);
    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        emailVerified: user.emailVerified,
      },
    };
  }

  async refresh(refreshToken: string): Promise<{ accessToken: string }> {
    let userId: number;
    try {
      const payload = this.jwtService.verify<JwtPayload>(refreshToken, {
        secret: this.config.get<string>('jwt.refreshSecret'),
      });
      userId = payload.sub;
    } catch {
      throw new UnauthorizedException('Недійсний токен оновлення');
    }

    const user = await this.usersRepo.findOne({ where: { id: userId } });
    if (!user?.refreshTokenHash) throw new UnauthorizedException('Доступ заборонено');

    const isMatch = await bcrypt.compare(refreshToken, user.refreshTokenHash);
    if (!isMatch) throw new UnauthorizedException('Недійсний токен оновлення');

    const payload: JwtPayload = { sub: user.id, email: user.email, role: user.role };
    const accessToken = this.jwtService.sign(payload, {
      secret: this.config.get<string>('jwt.secret'),
      expiresIn: this.config.get<string>('jwt.accessExpiresIn'),
    });

    return { accessToken };
  }

  async logout(userId: number): Promise<{ message: string }> {
    await this.usersRepo.update(userId, { refreshTokenHash: null });
    return { message: 'Logged out successfully' };
  }

  async forgotPassword(email: string): Promise<{ message: string }> {
    const user = await this.usersRepo.findOne({ where: { email } });

    // Завжди повертаємо однакову відповідь — захист від user enumeration
    if (user) {
      const token = crypto.randomBytes(32).toString('hex');
      const expires = new Date();
      expires.setHours(expires.getHours() + RESET_EXPIRES_HOURS);

      user.passwordResetToken = token;
      user.passwordResetExpires = expires;
      await this.usersRepo.save(user);

      await this.mailService.sendPasswordReset(email, token);
    }

    return { message: 'If this email exists, a reset link has been sent.' };
  }

  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    const user = await this.usersRepo.findOne({
      where: { passwordResetToken: token },
    });

    if (
      !user ||
      !user.passwordResetExpires ||
      user.passwordResetExpires < new Date()
    ) {
      throw new BadRequestException('Недійсний або прострочений токен скидання паролю');
    }

    user.passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    user.passwordResetToken = null;
    user.passwordResetExpires = null;
    user.refreshTokenHash = null; // інвалідуємо всі сесії
    await this.usersRepo.save(user);

    return { message: 'Password reset successfully' };
  }

  private async generateTokens(
    user: User,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const payload: JwtPayload = { sub: user.id, email: user.email, role: user.role };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.config.get<string>('jwt.secret'),
        expiresIn: this.config.get<string>('jwt.accessExpiresIn'),
      }),
      this.jwtService.signAsync(payload, {
        secret: this.config.get<string>('jwt.refreshSecret'),
        expiresIn: this.config.get<string>('jwt.refreshExpiresIn'),
      }),
    ]);

    return { accessToken, refreshToken };
  }
}
