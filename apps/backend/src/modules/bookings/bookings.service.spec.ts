import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  BadRequestException,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { BookingsService } from './bookings.service';
import { Booking } from '../../database/entities/booking.entity';
import { BookingService as BookingServiceEntity } from '../../database/entities/booking-service.entity';
import { BookingStatusHistory } from '../../database/entities/booking-status-history.entity';
import { MasterProfile } from '../../database/entities/master-profile.entity';
import { MasterService as MasterServiceEntity } from '../../database/entities/master-service.entity';
import { Service } from '../../database/entities/service.entity';
import { Vehicle } from '../../database/entities/vehicle.entity';
import { BookingStatus } from '../../common/enums/booking-status.enum';
import { Role } from '../../common/enums/role.enum';
import { User } from '../../database/entities/user.entity';

const makeUser = (overrides: Partial<User> = {}): User =>
  ({ id: 1, role: Role.CLIENT, email: 'c@t.com', isBlocked: false, ...overrides } as User);

const makeMaster = (id = 1): MasterProfile => ({ id } as MasterProfile);

const makeService = (id = 1): Service =>
  ({ id, basePrice: 500, baseDurationMinutes: 60 } as Service);

const makeMasterService = (serviceId = 1): MasterServiceEntity =>
  ({
    id: 1,
    service: makeService(serviceId),
    priceCoefficient: 1.0,
  } as MasterServiceEntity);

const makeVehicle = (clientId = 1): Vehicle =>
  ({ id: 1, client: { id: clientId } } as unknown as Vehicle);

const makeBooking = (overrides: Partial<Booking> = {}): Booking =>
  ({
    id: 1,
    status: BookingStatus.PENDING,
    scheduledAt: new Date(Date.now() + 3 * 3600_000), // 3h from now
    estimatedDurationMinutes: 60,
    client: makeUser(),
    master: { id: 1, user: { id: 2, role: Role.MASTER } } as unknown as MasterProfile,
    ...overrides,
  } as unknown as Booking);

// Mock transaction manager
const makeMockManager = (overlapBookings: Booking[] = []) => ({
  getRepository: jest.fn().mockReturnValue({
    createQueryBuilder: jest.fn().mockReturnValue({
      setLock: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue(overlapBookings),
    }),
  }),
  create: jest.fn().mockImplementation((_entity: unknown, data: unknown) => data),
  save: jest.fn().mockImplementation(async (_entity: unknown, data: unknown) => data),
  delete: jest.fn().mockResolvedValue(undefined),
});

const mockRepo = () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  findByIds: jest.fn(),
  findAndCount: jest.fn(),
  create: jest.fn().mockImplementation((data) => data),
  save: jest.fn().mockImplementation(async (data) => data),
  remove: jest.fn(),
  update: jest.fn(),
  createQueryBuilder: jest.fn(),
});

describe('BookingsService', () => {
  let service: BookingsService;
  let bookingsRepo: ReturnType<typeof mockRepo>;
  let masterProfilesRepo: ReturnType<typeof mockRepo>;
  let masterServicesRepo: ReturnType<typeof mockRepo>;
  let servicesRepo: ReturnType<typeof mockRepo>;
  let vehiclesRepo: ReturnType<typeof mockRepo>;
  let historyRepo: ReturnType<typeof mockRepo>;
  let dataSource: { transaction: jest.Mock };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingsService,
        { provide: getRepositoryToken(Booking), useFactory: mockRepo },
        { provide: getRepositoryToken(BookingServiceEntity), useFactory: mockRepo },
        { provide: getRepositoryToken(BookingStatusHistory), useFactory: mockRepo },
        { provide: getRepositoryToken(MasterProfile), useFactory: mockRepo },
        { provide: getRepositoryToken(MasterServiceEntity), useFactory: mockRepo },
        { provide: getRepositoryToken(Service), useFactory: mockRepo },
        { provide: getRepositoryToken(Vehicle), useFactory: mockRepo },
        {
          provide: DataSource,
          useValue: {
            transaction: jest.fn().mockImplementation(async (cb: (m: unknown) => unknown) =>
              cb(makeMockManager()),
            ),
          },
        },
      ],
    }).compile();

    service = module.get(BookingsService);
    bookingsRepo = module.get(getRepositoryToken(Booking));
    masterProfilesRepo = module.get(getRepositoryToken(MasterProfile));
    masterServicesRepo = module.get(getRepositoryToken(MasterServiceEntity));
    servicesRepo = module.get(getRepositoryToken(Service));
    vehiclesRepo = module.get(getRepositoryToken(Vehicle));
    historyRepo = module.get(getRepositoryToken(BookingStatusHistory));
    dataSource = module.get(DataSource);
  });

  const futureDate = new Date(Date.now() + 24 * 3600_000).toISOString();
  const pastDate = new Date(Date.now() - 3600_000).toISOString();

  const baseDto = {
    masterId: 1,
    vehicleId: 1,
    scheduledAt: futureDate,
    serviceIds: [1],
  };

  describe('create', () => {
    it('кидає BadRequestException якщо scheduledAt у минулому', async () => {
      await expect(
        service.create(makeUser(), { ...baseDto, scheduledAt: pastDate }),
      ).rejects.toThrow(BadRequestException);
    });

    it('кидає NotFoundException якщо майстер не існує', async () => {
      masterProfilesRepo.findOne.mockResolvedValue(null);
      await expect(service.create(makeUser(), baseDto)).rejects.toThrow(NotFoundException);
    });

    it('кидає NotFoundException якщо vehicle не знайдено', async () => {
      masterProfilesRepo.findOne.mockResolvedValue(makeMaster());
      vehiclesRepo.findOne.mockResolvedValue(null);
      await expect(service.create(makeUser(), baseDto)).rejects.toThrow(NotFoundException);
    });

    it('кидає ForbiddenException якщо vehicle чужий', async () => {
      masterProfilesRepo.findOne.mockResolvedValue(makeMaster());
      vehiclesRepo.findOne.mockResolvedValue(makeVehicle(99)); // інший clientId
      await expect(service.create(makeUser({ id: 1 }), baseDto)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('кидає NotFoundException якщо service не знайдено', async () => {
      masterProfilesRepo.findOne.mockResolvedValue(makeMaster());
      vehiclesRepo.findOne.mockResolvedValue(makeVehicle(1));
      servicesRepo.findByIds.mockResolvedValue([]); // порожньо
      await expect(service.create(makeUser(), baseDto)).rejects.toThrow(NotFoundException);
    });

    it('кидає BadRequestException якщо service не прив\'язаний до майстра', async () => {
      masterProfilesRepo.findOne.mockResolvedValue(makeMaster());
      vehiclesRepo.findOne.mockResolvedValue(makeVehicle(1));
      servicesRepo.findByIds.mockResolvedValue([makeService(1)]);
      masterServicesRepo.find.mockResolvedValue([]); // нема прив'язки
      await expect(service.create(makeUser(), baseDto)).rejects.toThrow(BadRequestException);
    });

    it('кидає ConflictException при overlapping booking', async () => {
      masterProfilesRepo.findOne.mockResolvedValue(makeMaster());
      vehiclesRepo.findOne.mockResolvedValue(makeVehicle(1));
      servicesRepo.findByIds.mockResolvedValue([makeService(1)]);
      masterServicesRepo.find.mockResolvedValue([makeMasterService(1)]);

      // Transaction returns overlap
      dataSource.transaction.mockImplementation(
        async (cb: (m: unknown) => unknown) => cb(makeMockManager([makeBooking()])),
      );

      await expect(service.create(makeUser(), baseDto)).rejects.toThrow(ConflictException);
    });

    it('правильно рахує totalPrice з коефіцієнтами', async () => {
      const ms = { ...makeMasterService(1), priceCoefficient: 1.5 };
      const svc = { ...makeService(1), basePrice: 400, baseDurationMinutes: 60 };

      masterProfilesRepo.findOne.mockResolvedValue(makeMaster());
      vehiclesRepo.findOne.mockResolvedValue(makeVehicle(1));
      servicesRepo.findByIds.mockResolvedValue([svc]);
      masterServicesRepo.find.mockResolvedValue([{ ...ms, service: svc }]);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let savedBooking: any = null;
      dataSource.transaction.mockImplementation(async (cb: (m: unknown) => unknown) => {
        const manager = makeMockManager([]);
        manager.save.mockImplementation(async (_e: unknown, data: unknown) => {
          if ((data as Partial<Booking>).totalPrice !== undefined) {
            savedBooking = data;
          }
          return data;
        });
        return cb(manager);
      });

      await service.create(makeUser(), baseDto);
      // 400 * 1.5 = 600
      expect(savedBooking?.totalPrice).toBe(600);
    });

    it('правильно рахує estimatedDurationMinutes', async () => {
      const ms = { ...makeMasterService(1), priceCoefficient: 2.0 };
      const svc = { ...makeService(1), basePrice: 200, baseDurationMinutes: 30 };

      masterProfilesRepo.findOne.mockResolvedValue(makeMaster());
      vehiclesRepo.findOne.mockResolvedValue(makeVehicle(1));
      servicesRepo.findByIds.mockResolvedValue([svc]);
      masterServicesRepo.find.mockResolvedValue([{ ...ms, service: svc }]);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let savedBooking: any = null;
      dataSource.transaction.mockImplementation(async (cb: (m: unknown) => unknown) => {
        const manager = makeMockManager([]);
        manager.save.mockImplementation(async (_e: unknown, data: unknown) => {
          if ((data as Partial<Booking>).estimatedDurationMinutes !== undefined) {
            savedBooking = data as Partial<Booking>;
          }
          return data;
        });
        return cb(manager);
      });

      await service.create(makeUser(), baseDto);
      // round(30 * 2.0) = 60
      expect(savedBooking?.estimatedDurationMinutes).toBe(60);
    });

    it('зберігає BookingStatusHistory з oldStatus=null', async () => {
      masterProfilesRepo.findOne.mockResolvedValue(makeMaster());
      vehiclesRepo.findOne.mockResolvedValue(makeVehicle(1));
      servicesRepo.findByIds.mockResolvedValue([makeService(1)]);
      masterServicesRepo.find.mockResolvedValue([makeMasterService(1)]);

      const savedHistories: unknown[] = [];
      dataSource.transaction.mockImplementation(async (cb: (m: unknown) => unknown) => {
        const manager = makeMockManager([]);
        manager.save.mockImplementation(async (_e: unknown, data: unknown) => {
          if ((data as { oldStatus?: unknown }).oldStatus !== undefined || (data as { newStatus?: unknown }).newStatus) {
            if ((data as { newStatus?: BookingStatus }).newStatus === BookingStatus.PENDING) {
              savedHistories.push(data);
            }
          }
          return data;
        });
        return cb(manager);
      });

      await service.create(makeUser(), baseDto);
      const historyEntry = savedHistories.find(
        (h) => (h as { newStatus: BookingStatus }).newStatus === BookingStatus.PENDING,
      ) as { oldStatus: unknown } | undefined;
      expect(historyEntry?.oldStatus).toBeNull();
    });
  });

  describe('updateStatus', () => {
    it('PENDING → CONFIRMED дозволено для MASTER', async () => {
      const master = makeUser({ id: 2, role: Role.MASTER });
      const booking = makeBooking({ status: BookingStatus.PENDING });
      bookingsRepo.findOne.mockResolvedValue(booking);
      bookingsRepo.save.mockResolvedValue({ ...booking, status: BookingStatus.CONFIRMED });
      historyRepo.create.mockImplementation((data: unknown) => data);
      historyRepo.save.mockResolvedValue({});

      const result = await service.updateStatus(
        1,
        master,
        { status: BookingStatus.CONFIRMED },
      );
      expect(result.status).toBe(BookingStatus.CONFIRMED);
    });

    it('PENDING → IN_PROGRESS заборонено (пропущений крок)', async () => {
      bookingsRepo.findOne.mockResolvedValue(makeBooking({ status: BookingStatus.PENDING }));
      await expect(
        service.updateStatus(1, makeUser({ role: Role.MASTER }), {
          status: BookingStatus.IN_PROGRESS,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('COMPLETED → CANCELLED заборонено (фінальний статус)', async () => {
      bookingsRepo.findOne.mockResolvedValue(
        makeBooking({ status: BookingStatus.COMPLETED }),
      );
      await expect(
        service.updateStatus(1, makeUser({ role: Role.ADMIN }), {
          status: BookingStatus.CANCELLED,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('CLIENT не може підтвердити booking', async () => {
      bookingsRepo.findOne.mockResolvedValue(makeBooking({ status: BookingStatus.PENDING }));
      await expect(
        service.updateStatus(1, makeUser({ role: Role.CLIENT }), {
          status: BookingStatus.CONFIRMED,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('зберігає запис у BookingStatusHistory', async () => {
      const booking = makeBooking({ status: BookingStatus.PENDING });
      bookingsRepo.findOne.mockResolvedValue(booking);
      bookingsRepo.save.mockResolvedValue({ ...booking, status: BookingStatus.CONFIRMED });
      historyRepo.create.mockImplementation((data: unknown) => data);
      historyRepo.save.mockResolvedValue({});

      await service.updateStatus(1, makeUser({ role: Role.MASTER }), {
        status: BookingStatus.CONFIRMED,
      });
      expect(historyRepo.save).toHaveBeenCalled();
    });
  });

  describe('cancel', () => {
    it('CLIENT може скасувати PENDING booking свій', async () => {
      const client = makeUser({ id: 1, role: Role.CLIENT });
      const booking = makeBooking({
        status: BookingStatus.PENDING,
        client,
        scheduledAt: new Date(Date.now() + 4 * 3600_000), // 4h from now
      });
      bookingsRepo.findOne.mockResolvedValue(booking);
      bookingsRepo.save.mockResolvedValue({ ...booking, status: BookingStatus.CANCELLED });
      historyRepo.create.mockImplementation((d: unknown) => d);
      historyRepo.save.mockResolvedValue({});

      const result = await service.cancel(1, client);
      expect(result.status).toBe(BookingStatus.CANCELLED);
    });

    it('кидає ForbiddenException якщо booking чужий', async () => {
      const booking = makeBooking({ client: makeUser({ id: 99 }) });
      bookingsRepo.findOne.mockResolvedValue(booking);
      await expect(service.cancel(1, makeUser({ id: 1 }))).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('кидає BadRequestException якщо < 2 години до запису', async () => {
      const client = makeUser({ id: 1 });
      const booking = makeBooking({
        client,
        scheduledAt: new Date(Date.now() + 30 * 60_000), // 30 хв
      });
      bookingsRepo.findOne.mockResolvedValue(booking);
      await expect(service.cancel(1, client)).rejects.toThrow(BadRequestException);
    });
  });
});
