import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { VehiclesService } from './vehicles.service';
import { Vehicle } from '../../database/entities/vehicle.entity';
import { Booking } from '../../database/entities/booking.entity';

const makeVehicle = (clientId = 1): Vehicle =>
  ({
    id: 1,
    make: 'Toyota',
    model: 'Camry',
    year: 2020,
    vin: null,
    plateNumber: 'AA1234BB',
    client: { id: clientId },
  }) as unknown as Vehicle;

const mockRepo = () => ({
  create: jest.fn().mockImplementation((d) => d),
  save: jest.fn().mockImplementation(async (d) => d),
  find: jest.fn(),
  findOne: jest.fn(),
  remove: jest.fn().mockResolvedValue(undefined),
});

describe('VehiclesService', () => {
  let service: VehiclesService;
  let repo: ReturnType<typeof mockRepo>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VehiclesService,
        { provide: getRepositoryToken(Vehicle), useFactory: mockRepo },
        {
          provide: getRepositoryToken(Booking),
          useFactory: () => {
            const qb = { update: jest.fn().mockReturnThis(), set: jest.fn().mockReturnThis(), where: jest.fn().mockReturnThis(), execute: jest.fn().mockResolvedValue(undefined) };
            return { count: jest.fn().mockResolvedValue(0), createQueryBuilder: jest.fn().mockReturnValue(qb) };
          },
        },
      ],
    }).compile();
    service = module.get(VehiclesService);
    repo = module.get(getRepositoryToken(Vehicle));
  });

  it('create: saves vehicle with clientId', async () => {
    const dto = { make: 'Toyota', model: 'Camry', year: 2020 };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await service.create(1, dto as any);
    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({ make: 'Toyota', client: { id: 1 } }),
    );
    expect(repo.save).toHaveBeenCalled();
    expect(result).toBeDefined();
  });

  it('findMyVehicles: returns vehicles for client', async () => {
    repo.find.mockResolvedValue([makeVehicle(1)]);
    const result = await service.findMyVehicles(1);
    expect(result).toHaveLength(1);
    expect(repo.find).toHaveBeenCalledWith(
      expect.objectContaining({ where: { client: { id: 1 } } }),
    );
  });

  describe('findOne', () => {
    it('returns vehicle when found and owner matches', async () => {
      repo.findOne.mockResolvedValue(makeVehicle(1));
      const result = await service.findOne(1, 1);
      expect(result.id).toBe(1);
    });

    it('throws NotFoundException when not found', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.findOne(1, 1)).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when client does not own vehicle', async () => {
      repo.findOne.mockResolvedValue(makeVehicle(99));
      await expect(service.findOne(1, 1)).rejects.toThrow(ForbiddenException);
    });
  });

  it('update: updates and saves vehicle', async () => {
    repo.findOne.mockResolvedValue(makeVehicle(1));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await service.update(1, 1, { model: 'Corolla' } as any);
    expect(repo.save).toHaveBeenCalled();
    expect(result).toBeDefined();
  });

  it('remove: deletes vehicle and returns message', async () => {
    repo.findOne.mockResolvedValue(makeVehicle(1));
    const result = await service.remove(1, 1);
    expect(result.message).toBeTruthy();
    expect(repo.remove).toHaveBeenCalled();
  });
});
