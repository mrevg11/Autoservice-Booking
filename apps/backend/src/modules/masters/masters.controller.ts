import {
  Controller,
  Get,
  Patch,
  Put,
  Post,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
  ApiResponse,
} from '@nestjs/swagger';
import { MastersService } from './masters.service';
import { UpdateMasterProfileDto } from './dto/update-master-profile.dto';
import { SetScheduleDto } from './dto/set-schedule.dto';
import { CreateDayOffDto } from './dto/create-day-off.dto';
import { AssignServiceDto } from './dto/assign-service.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '../../common/enums/role.enum';
import { User } from '../../database/entities/user.entity';

@ApiTags('Masters')
@Controller('masters')
export class MastersController {
  constructor(private readonly mastersService: MastersService) {}

  // ─── Static /me routes — MUST be before /:id ──────────────────────────────

  @Patch('me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.MASTER)
  @ApiBearerAuth()
  @ApiOperation({ summary: '[MASTER] Оновити свій профіль' })
  updateMyProfile(@CurrentUser() user: User, @Body() dto: UpdateMasterProfileDto) {
    return this.mastersService.updateProfile(user.id, dto);
  }

  @Put('me/schedule')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.MASTER)
  @ApiBearerAuth()
  @ApiOperation({ summary: '[MASTER] Замінити повний розклад' })
  setSchedule(@CurrentUser() user: User, @Body() dto: SetScheduleDto) {
    return this.mastersService.setSchedule(user.id, dto.schedule);
  }

  @Post('me/days-off')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.MASTER)
  @ApiBearerAuth()
  @ApiOperation({ summary: '[MASTER] Додати вихідний день' })
  addDayOff(@CurrentUser() user: User, @Body() dto: CreateDayOffDto) {
    return this.mastersService.addDayOff(user.id, dto);
  }

  @Delete('me/days-off/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.MASTER)
  @ApiBearerAuth()
  @ApiOperation({ summary: '[MASTER] Видалити вихідний день' })
  removeDayOff(@CurrentUser() user: User, @Param('id', ParseIntPipe) id: number) {
    return this.mastersService.removeDayOff(user.id, id);
  }

  @Post('me/services')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.MASTER, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: '[MASTER/ADMIN] Призначити послугу майстру' })
  assignService(@CurrentUser() user: User, @Body() dto: AssignServiceDto) {
    return this.mastersService.assignService(user.id, dto);
  }

  @Delete('me/services/:serviceId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.MASTER, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: '[MASTER/ADMIN] Відкріпити послугу від майстра' })
  removeService(
    @CurrentUser() user: User,
    @Param('serviceId', ParseIntPipe) serviceId: number,
  ) {
    return this.mastersService.removeService(user.id, serviceId);
  }

  // ─── Public & authenticated routes ────────────────────────────────────────

  @Get()
  @ApiOperation({ summary: 'Список майстрів' })
  findAll(@Query() pagination: PaginationDto) {
    return this.mastersService.findAll(pagination);
  }

  @Get('for-services')
  @ApiOperation({ summary: 'Майстри що виконують ВСІ зазначені послуги' })
  findForServices(@Query('serviceIds') serviceIds: string) {
    const ids = (serviceIds ?? '').split(',').map(Number).filter(Boolean);
    return this.mastersService.findAllForServices(ids);
  }

  @Get(':id/schedule')
  @ApiOperation({ summary: 'Розклад майстра' })
  @ApiResponse({ status: 404 })
  getSchedule(@Param('id', ParseIntPipe) id: number) {
    return this.mastersService.getSchedule(id);
  }

  @Get(':id/slots')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '[Auth] Вільні слоти майстра на дату' })
  @ApiQuery({ name: 'date', example: '2026-12-15' })
  @ApiQuery({ name: 'duration', example: 60, type: Number })
  @ApiQuery({ name: 'vehicleId', required: false, type: Number, description: 'Фільтрує слоти з урахуванням зайнятості авто' })
  getAvailableSlots(
    @Param('id', ParseIntPipe) id: number,
    @Query('date') date: string,
    @Query('duration') duration: string,
    @Query('vehicleId') vehicleId?: string,
  ) {
    return this.mastersService.getAvailableSlots(
      id,
      date,
      parseInt(duration, 10) || 60,
      vehicleId ? parseInt(vehicleId, 10) : undefined,
    );
  }

  @Patch(':id/schedule')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: '[ADMIN] Оновити розклад майстра' })
  adminSetSchedule(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SetScheduleDto,
  ) {
    return this.mastersService.setScheduleForMaster(id, dto.schedule);
  }

  @Get(':id/working-days')
  @ApiOperation({ summary: 'Робочі дні майстра (JS getDay формат: 0=Нд … 6=Сб)' })
  getWorkingDays(@Param('id', ParseIntPipe) id: number) {
    return this.mastersService.getWorkingDaysJs(id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Майстер за ID' })
  @ApiResponse({ status: 404 })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.mastersService.findOne(id);
  }
}
