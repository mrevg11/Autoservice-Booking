import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ConflictException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { User } from '../../database/entities/user.entity';
import { ClientProfile } from '../../database/entities/client-profile.entity';
import { MasterProfile } from '../../database/entities/master-profile.entity';
import { MailService } from '../mail/mail.service';
import { Role } from '../../common/enums/role.enum';
import * as bcrypt from 'bcrypt';

const mockUser = (overrides: Partial<User> = {}): User =>
  ({
    id: 1,
    email: 'test@test.com',
    passwordHash: '$2b$12$hashedpassword',
    role: Role.CLIENT,
    firstName: 'Тест',
    lastName: 'Юзер',
    phone: null,
    emailVerified: true,
    emailVerificationToken: null,
    passwordResetToken: null,
    passwordResetExpires: null,
    refreshTokenHash: null,
    isBlocked: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as User);

const mockUsersRepo = () => ({
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
});

const mockProfilesRepo = () => ({
  create: jest.fn(),
  save: jest.fn(),
});

const mockJwtService = () => ({
  sign: jest.fn().mockReturnValue('access-token'),
  signAsync: jest.fn().mockResolvedValue('access-token'),
});

const mockConfigService = () => ({
  get: jest.fn().mockReturnValue('test-secret'),
});

const mockMailService = () => ({
  sendEmailVerification: jest.fn().mockResolvedValue(undefined),
  sendPasswordReset: jest.fn().mockResolvedValue(undefined),
});

describe('AuthService', () => {
  let service: AuthService;
  let usersRepo: ReturnType<typeof mockUsersRepo>;
  let profilesRepo: ReturnType<typeof mockProfilesRepo>;
  let jwtService: ReturnType<typeof mockJwtService>;
  let mailService: ReturnType<typeof mockMailService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useFactory: mockUsersRepo },
        { provide: getRepositoryToken(ClientProfile), useFactory: mockProfilesRepo },
        { provide: getRepositoryToken(MasterProfile), useFactory: mockProfilesRepo },
        { provide: JwtService, useFactory: mockJwtService },
        { provide: ConfigService, useFactory: mockConfigService },
        { provide: MailService, useFactory: mockMailService },
      ],
    }).compile();

    service = module.get(AuthService);
    usersRepo = module.get(getRepositoryToken(User));
    profilesRepo = module.get(getRepositoryToken(ClientProfile));
    jwtService = module.get(JwtService);
    mailService = module.get(MailService);
  });

  describe('register', () => {
    const dto = {
      email: 'new@test.com',
      password: 'SecurePass123!',
      firstName: 'Іван',
      lastName: 'Петренко',
      phone: '+380991234567',
    };

    it('повинен успішно реєструвати нового користувача', async () => {
      usersRepo.findOne.mockResolvedValue(null);
      usersRepo.create.mockReturnValue({ ...mockUser(), email: dto.email });
      usersRepo.save.mockResolvedValue(mockUser({ email: dto.email }));
      profilesRepo.create.mockReturnValue({});
      profilesRepo.save.mockResolvedValue({});

      const result = await service.register(dto);

      expect(result.message).toContain('Registration successful');
      expect(usersRepo.save).toHaveBeenCalled();
    });

    it('повинен кидати ConflictException якщо email вже існує', async () => {
      usersRepo.findOne.mockResolvedValue(mockUser());

      await expect(service.register(dto)).rejects.toThrow(ConflictException);
    });

    it('повинен хешувати пароль (не зберігати plain text)', async () => {
      usersRepo.findOne.mockResolvedValue(null);
      let savedUser: Partial<User> = {};
      usersRepo.create.mockImplementation((data: Partial<User>) => {
        savedUser = data;
        return data;
      });
      usersRepo.save.mockResolvedValue(mockUser());
      profilesRepo.create.mockReturnValue({});
      profilesRepo.save.mockResolvedValue({});

      await service.register(dto);

      expect(savedUser.passwordHash).toBeDefined();
      expect(savedUser.passwordHash).not.toBe(dto.password);
      const isHashed = await bcrypt.compare(dto.password, savedUser.passwordHash as string);
      expect(isHashed).toBe(true);
    });

    it('повинен створювати ClientProfile', async () => {
      usersRepo.findOne.mockResolvedValue(null);
      usersRepo.create.mockReturnValue(mockUser());
      usersRepo.save.mockResolvedValue(mockUser());
      profilesRepo.create.mockReturnValue({});
      profilesRepo.save.mockResolvedValue({});

      await service.register(dto);

      expect(profilesRepo.create).toHaveBeenCalled();
      expect(profilesRepo.save).toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('повинен повертати accessToken при правильних даних', async () => {
      const hash = await bcrypt.hash('SecurePass123!', 12);
      usersRepo.findOne.mockResolvedValue(mockUser({ passwordHash: hash }));
      usersRepo.save.mockResolvedValue(mockUser());

      const result = await service.login({ email: 'test@test.com', password: 'SecurePass123!' });

      expect(result.accessToken).toBeDefined();
      expect(result.user).toBeDefined();
    });

    it('повинен кидати UnauthorizedException при неправильному паролі', async () => {
      const hash = await bcrypt.hash('CorrectPass123!', 12);
      usersRepo.findOne.mockResolvedValue(mockUser({ passwordHash: hash }));

      await expect(
        service.login({ email: 'test@test.com', password: 'WrongPass123!' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('повинен кидати UnauthorizedException при неіснуючому email', async () => {
      usersRepo.findOne.mockResolvedValue(null);

      await expect(
        service.login({ email: 'nobody@test.com', password: 'Pass123!' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('повинен кидати UnauthorizedException якщо user.isBlocked = true', async () => {
      const hash = await bcrypt.hash('SecurePass123!', 12);
      usersRepo.findOne.mockResolvedValue(
        mockUser({ passwordHash: hash, isBlocked: true }),
      );

      await expect(
        service.login({ email: 'test@test.com', password: 'SecurePass123!' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('не повинен повертати passwordHash у відповіді', async () => {
      const hash = await bcrypt.hash('SecurePass123!', 12);
      usersRepo.findOne.mockResolvedValue(mockUser({ passwordHash: hash }));
      usersRepo.save.mockResolvedValue(mockUser());

      const result = await service.login({ email: 'test@test.com', password: 'SecurePass123!' });

      expect(result).not.toHaveProperty('passwordHash');
      expect(JSON.stringify(result)).not.toContain('passwordHash');
    });
  });

  describe('logout', () => {
    it('повинен встановлювати refreshTokenHash = null', async () => {
      usersRepo.update.mockResolvedValue({ affected: 1 });

      await service.logout(1);

      expect(usersRepo.update).toHaveBeenCalledWith(1, { refreshTokenHash: null });
    });
  });

  describe('forgotPassword', () => {
    it('повинен повертати однакову відповідь незалежно від наявності email', async () => {
      usersRepo.findOne.mockResolvedValue(null);
      const resultNotFound = await service.forgotPassword('nobody@test.com');

      usersRepo.findOne.mockResolvedValue(mockUser());
      usersRepo.save.mockResolvedValue(mockUser());
      const resultFound = await service.forgotPassword('test@test.com');

      expect(resultNotFound.message).toBe(resultFound.message);
    });
  });

  describe('resetPassword', () => {
    it('повинен кидати BadRequestException при невалідному токені', async () => {
      usersRepo.findOne.mockResolvedValue(null);

      await expect(
        service.resetPassword('invalid-token', 'NewPass123!'),
      ).rejects.toThrow(BadRequestException);
    });

    it('повинен кидати BadRequestException при протермінованому токені', async () => {
      const expiredDate = new Date();
      expiredDate.setHours(expiredDate.getHours() - 2);
      usersRepo.findOne.mockResolvedValue(
        mockUser({ passwordResetToken: 'valid', passwordResetExpires: expiredDate }),
      );

      await expect(
        service.resetPassword('valid', 'NewPass123!'),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
