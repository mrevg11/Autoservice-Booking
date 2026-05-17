import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, In } from 'typeorm';
import { Vehicle } from '../../database/entities/vehicle.entity';
import { Booking } from '../../database/entities/booking.entity';
import { BookingStatus } from '../../common/enums/booking-status.enum';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';

@Injectable()
export class VehiclesService {
  constructor(
    @InjectRepository(Vehicle)
    private vehiclesRepo: Repository<Vehicle>,
    @InjectRepository(Booking)
    private bookingsRepo: Repository<Booking>,
  ) {}

  async create(clientId: number, dto: CreateVehicleDto): Promise<Vehicle> {
    if (dto.vin) {
      const existing = await this.vehiclesRepo.findOne({ where: { vin: dto.vin } });
      if (existing) throw new ConflictException('Автомобіль з таким VIN вже зареєстровано');
    }
    if (dto.plateNumber) {
      const existing = await this.vehiclesRepo.findOne({ where: { plateNumber: dto.plateNumber } });
      if (existing) throw new ConflictException('Автомобіль з таким держ. номером вже зареєстровано');
    }
    const vehicle = this.vehiclesRepo.create({
      ...dto,
      vin: dto.vin ?? null,
      plateNumber: dto.plateNumber ?? null,
      client: { id: clientId } as never,
    });
    return this.vehiclesRepo.save(vehicle);
  }

  async findMyVehicles(clientId: number): Promise<Vehicle[]> {
    return this.vehiclesRepo.find({
      where: { client: { id: clientId } },
      order: { id: 'DESC' },
    });
  }

  async findOne(id: number, clientId: number): Promise<Vehicle> {
    const vehicle = await this.vehiclesRepo.findOne({
      where: { id },
      relations: ['client'],
    });
    if (!vehicle) throw new NotFoundException('Автомобіль не знайдено');
    if (vehicle.client.id !== clientId)
      throw new ForbiddenException('Доступ заборонено');
    return vehicle;
  }

  async update(id: number, clientId: number, dto: UpdateVehicleDto): Promise<Vehicle> {
    const vehicle = await this.findOne(id, clientId);
    if (dto.vin) {
      const existing = await this.vehiclesRepo.findOne({ where: { vin: dto.vin, id: Not(id) } });
      if (existing) throw new ConflictException('Автомобіль з таким VIN вже зареєстровано');
    }
    if (dto.plateNumber) {
      const existing = await this.vehiclesRepo.findOne({ where: { plateNumber: dto.plateNumber, id: Not(id) } });
      if (existing) throw new ConflictException('Автомобіль з таким держ. номером вже зареєстровано');
    }
    Object.assign(vehicle, dto);
    return this.vehiclesRepo.save(vehicle);
  }

  async remove(id: number, clientId: number): Promise<{ message: string }> {
    const vehicle = await this.findOne(id, clientId);
    const activeCount = await this.bookingsRepo.count({
      where: {
        vehicle: { id },
        status: In([BookingStatus.PENDING, BookingStatus.CONFIRMED, BookingStatus.IN_PROGRESS]),
      },
    });
    if (activeCount > 0) {
      throw new ConflictException('Неможливо видалити авто з активними записами. Спочатку скасуйте записи.');
    }
    // Nullify vehicle FK in all remaining bookings to avoid FK constraint violation
    await this.bookingsRepo
      .createQueryBuilder()
      .update()
      .set({ vehicle: null as never })
      .where('vehicleId = :id', { id })
      .execute();
    await this.vehiclesRepo.remove(vehicle);
    return { message: 'Автомобіль видалено' };
  }
}
