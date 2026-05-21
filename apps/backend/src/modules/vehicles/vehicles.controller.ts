import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { VehiclesService } from './vehicles.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '../../common/enums/role.enum';
import { User } from '../../database/entities/user.entity';

@ApiTags('Vehicles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.CLIENT)
@Controller('vehicles')
export class VehiclesController {
  constructor(private readonly vehiclesService: VehiclesService) {}

  @Post()
  @ApiOperation({ summary: '[CLIENT] Додати автомобіль' })
  @ApiResponse({ status: 201 })
  create(@CurrentUser() user: User, @Body() dto: CreateVehicleDto) {
    return this.vehiclesService.create(user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: '[CLIENT] Мої автомобілі' })
  findAll(@CurrentUser() user: User) {
    return this.vehiclesService.findMyVehicles(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: '[CLIENT] Автомобіль за ID (тільки свій)' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Not found' })
  findOne(@CurrentUser() user: User, @Param('id', ParseIntPipe) id: number) {
    return this.vehiclesService.findOne(id, user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: '[CLIENT] Оновити автомобіль' })
  update(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateVehicleDto,
  ) {
    return this.vehiclesService.update(id, user.id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '[CLIENT] Видалити автомобіль' })
  remove(@CurrentUser() user: User, @Param('id', ParseIntPipe) id: number) {
    return this.vehiclesService.remove(id, user.id);
  }

  @Get('admin/all')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: '[ADMIN] Усі автомобілі з даними власника' })
  adminFindAll(
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 20,
  ) {
    return this.vehiclesService.adminFindAll(page, limit);
  }

  @Delete('admin/:id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: '[ADMIN] Видалити будь-який автомобіль' })
  adminRemove(@Param('id', ParseIntPipe) id: number) {
    return this.vehiclesService.adminRemove(id);
  }
}
