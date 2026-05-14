import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Like, Repository } from 'typeorm';
import { ServiceCategory } from '../../database/entities/service-category.entity';
import { Service } from '../../database/entities/service.entity';
import { CreateCategoryDto } from './dto/create-category.dto';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { PaginationDto, paginate, PaginatedResult } from '../../common/dto/pagination.dto';

@Injectable()
export class ServicesService {
  constructor(
    @InjectRepository(ServiceCategory)
    private categoriesRepo: Repository<ServiceCategory>,
    @InjectRepository(Service)
    private servicesRepo: Repository<Service>,
  ) {}

  async createCategory(dto: CreateCategoryDto): Promise<ServiceCategory> {
    const category = this.categoriesRepo.create(dto);
    return this.categoriesRepo.save(category);
  }

  async findAllCategories(): Promise<ServiceCategory[]> {
    return this.categoriesRepo.find({ where: { isActive: true }, order: { name: 'ASC' } });
  }

  async updateCategory(id: number, dto: Partial<CreateCategoryDto>): Promise<ServiceCategory> {
    const category = await this.categoriesRepo.findOne({ where: { id } });
    if (!category) throw new NotFoundException(`Category #${id} not found`);
    Object.assign(category, dto);
    return this.categoriesRepo.save(category);
  }

  async createService(dto: CreateServiceDto): Promise<Service> {
    const category = await this.categoriesRepo.findOne({ where: { id: dto.categoryId } });
    if (!category) throw new NotFoundException(`Category #${dto.categoryId} not found`);

    const service = this.servicesRepo.create({
      name: dto.name,
      description: dto.description ?? null,
      basePrice: dto.basePrice,
      baseDurationMinutes: dto.baseDurationMinutes,
      category,
    });
    return this.servicesRepo.save(service);
  }

  async findAllServices(
    filters: { categoryId?: number; isActive?: boolean; search?: string },
    pagination: PaginationDto,
  ): Promise<PaginatedResult<Service>> {
    const { page = 1, limit = 20 } = pagination;
    const qb = this.servicesRepo
      .createQueryBuilder('s')
      .leftJoinAndSelect('s.category', 'category')
      .orderBy('s.name', 'ASC')
      .skip((page - 1) * limit)
      .take(limit);

    if (filters.categoryId !== undefined) {
      qb.andWhere('category.id = :categoryId', { categoryId: filters.categoryId });
    }
    if (filters.isActive !== undefined) {
      qb.andWhere('s.isActive = :isActive', { isActive: filters.isActive });
    }
    if (filters.search) {
      qb.andWhere('s.name LIKE :search', { search: `%${filters.search}%` });
    }

    const [data, total] = await qb.getManyAndCount();
    return paginate(data, total, pagination);
  }

  async findOneService(id: number): Promise<Service> {
    const service = await this.servicesRepo.findOne({
      where: { id },
      relations: ['category'],
    });
    if (!service) throw new NotFoundException(`Service #${id} not found`);
    return service;
  }

  async updateService(id: number, dto: UpdateServiceDto): Promise<Service> {
    const service = await this.findOneService(id);
    if (dto.categoryId !== undefined) {
      const category = await this.categoriesRepo.findOne({ where: { id: dto.categoryId } });
      if (!category) throw new NotFoundException(`Category #${dto.categoryId} not found`);
      service.category = category;
    }
    const { categoryId: _categoryId, ...rest } = dto;
    Object.assign(service, rest);
    return this.servicesRepo.save(service);
  }

  async removeService(id: number): Promise<{ message: string }> {
    const service = await this.findOneService(id);
    await this.servicesRepo.remove(service);
    return { message: `Service #${id} deleted` };
  }
}
