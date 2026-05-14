import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';
import { User } from '../../database/entities/user.entity';
import { MasterProfile } from '../../database/entities/master-profile.entity';
import { Role } from '../../common/enums/role.enum';

const mockUser = (overrides: Partial<User> = {}): User =>
  ({
    id: 1,
    email: 'test@test.com',
    passwordHash: '$2b$12$secret',
    role: Role.CLIENT,
    firstName: 'Тест',
    lastName: 'Юзер',
    phone: null,
    emailVerified: true,
    isBlocked: false,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  } as User);

const mockUsersRepo = () => ({
  findOne: jest.fn(),
  findAndCount: jest.fn(),
  save: jest.fn(),
  remove: jest.fn(),
});

describe('UsersService', () => {
  let service: UsersService;
  let usersRepo: ReturnType<typeof mockUsersRepo>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(User), useFactory: mockUsersRepo },
        { provide: getRepositoryToken(MasterProfile), useFactory: () => ({ create: jest.fn(), save: jest.fn() }) },
      ],
    }).compile();

    service = module.get(UsersService);
    usersRepo = module.get(getRepositoryToken(User));
  });

  it('getMe: повертає UserResponseDto без passwordHash', async () => {
    usersRepo.findOne.mockResolvedValue(mockUser());

    const result = await service.getMe(1);

    expect(result).not.toHaveProperty('passwordHash');
    expect(result.id).toBe(1);
    expect(result.email).toBe('test@test.com');
  });

  it('getMe: кидає NotFoundException для неіснуючого id', async () => {
    usersRepo.findOne.mockResolvedValue(null);

    await expect(service.getMe(999)).rejects.toThrow(NotFoundException);
  });

  it('findAll: повертає PaginatedResult з правильним totalPages', async () => {
    const users = Array.from({ length: 5 }, (_, i) => mockUser({ id: i + 1 }));
    usersRepo.findAndCount.mockResolvedValue([users, 25]);

    const result = await service.findAll({ page: 2, limit: 10 });

    expect(result.data).toHaveLength(5);
    expect(result.total).toBe(25);
    expect(result.totalPages).toBe(3);
    expect(result.page).toBe(2);
  });

  it('adminUpdate: оновлює роль і isBlocked', async () => {
    const user = mockUser({ role: Role.CLIENT, isBlocked: false });
    usersRepo.findOne.mockResolvedValue(user);
    usersRepo.save.mockImplementation(async (u: User) => u);

    const result = await service.adminUpdate(1, { role: Role.MASTER, isBlocked: true });

    expect(result.role).toBe(Role.MASTER);
    expect(result.isBlocked).toBe(true);
  });

  it('remove: видаляє користувача', async () => {
    usersRepo.findOne.mockResolvedValue(mockUser());
    usersRepo.remove.mockResolvedValue(undefined);

    const result = await service.remove(1);

    expect(usersRepo.remove).toHaveBeenCalled();
    expect(result.message).toContain('1');
  });

  it('remove: кидає NotFoundException для неіснуючого id', async () => {
    usersRepo.findOne.mockResolvedValue(null);

    await expect(service.remove(999)).rejects.toThrow(NotFoundException);
  });
});
