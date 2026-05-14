import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Vehicle } from '../../database/entities/vehicle.entity';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';

@Injectable()
export class VehiclesService {
  constructor(
    @InjectRepository(Vehicle)
    private vehiclesRepo: Repository<Vehicle>,
  ) {}

  async create(clientId: number, dto: CreateVehicleDto): Promise<Vehicle> {
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
    if (!vehicle) throw new NotFoundException(`Vehicle #${id} not found`);
    if (vehicle.client.id !== clientId)
      throw new ForbiddenException('Access denied');
    return vehicle;
  }

  async update(id: number, clientId: number, dto: UpdateVehicleDto): Promise<Vehicle> {
    const vehicle = await this.findOne(id, clientId);
    Object.assign(vehicle, dto);
    return this.vehiclesRepo.save(vehicle);
  }

  async remove(id: number, clientId: number): Promise<{ message: string }> {
    const vehicle = await this.findOne(id, clientId);
    await this.vehiclesRepo.remove(vehicle);
    return { message: `Vehicle #${id} deleted` };
  }
}
