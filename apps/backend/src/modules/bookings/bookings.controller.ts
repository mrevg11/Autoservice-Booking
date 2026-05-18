import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingStatusDto } from './dto/update-booking-status.dto';
import { BookingFilterDto } from './dto/booking-filter.dto';
import { CreateBookingPhotoDto } from './dto/create-booking-photo.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '../../common/enums/role.enum';
import { User } from '../../database/entities/user.entity';

@ApiTags('Bookings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.CLIENT)
  @ApiOperation({ summary: '[CLIENT] Створити запис' })
  @ApiResponse({ status: 201 })
  @ApiResponse({ status: 400, description: 'Past date / service not assigned' })
  @ApiResponse({ status: 409, description: 'Time slot already booked' })
  create(@CurrentUser() user: User, @Body() dto: CreateBookingDto) {
    return this.bookingsService.create(user, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Список записів (з урахуванням ролі)' })
  findAll(@CurrentUser() user: User, @Query() filters: BookingFilterDto) {
    return this.bookingsService.findAll(user, filters);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Запис за ID' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Not found' })
  findOne(@CurrentUser() user: User, @Param('id', ParseIntPipe) id: number) {
    return this.bookingsService.findOne(id, user);
  }

  @Patch(':id/status')
  @UseGuards(RolesGuard)
  @Roles(Role.MASTER, Role.ADMIN)
  @ApiOperation({ summary: '[MASTER/ADMIN] Змінити статус запису' })
  @ApiResponse({ status: 400, description: 'Invalid transition' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  updateStatus(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateBookingStatusDto,
  ) {
    return this.bookingsService.updateStatus(id, user, dto);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RolesGuard)
  @Roles(Role.CLIENT)
  @ApiOperation({ summary: '[CLIENT] Скасувати запис' })
  @ApiResponse({ status: 400, description: 'Cannot cancel (deadline / wrong status)' })
  @ApiResponse({ status: 403, description: 'Not your booking' })
  cancel(@CurrentUser() user: User, @Param('id', ParseIntPipe) id: number) {
    return this.bookingsService.cancel(id, user);
  }

  @Delete(':id/force')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: '[ADMIN] Повне видалення запису з БД' })
  @ApiResponse({ status: 200, description: 'Booking permanently deleted' })
  @ApiResponse({ status: 404, description: 'Not found' })
  forceDelete(@Param('id', ParseIntPipe) id: number) {
    return this.bookingsService.forceDelete(id);
  }

  @Get(':id/history')
  @ApiOperation({ summary: 'Історія змін статусів' })
  getHistory(@CurrentUser() user: User, @Param('id', ParseIntPipe) id: number) {
    return this.bookingsService.getHistory(id, user);
  }

  @Get(':id/photos')
  @ApiOperation({ summary: 'Фотографії замовлення' })
  getPhotos(@CurrentUser() user: User, @Param('id', ParseIntPipe) id: number) {
    return this.bookingsService.getPhotos(id, user);
  }

  @Post(':id/photos')
  @ApiOperation({ summary: 'Додати фото до замовлення (Base64)' })
  addPhoto(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateBookingPhotoDto,
  ) {
    return this.bookingsService.addPhoto(id, user, dto);
  }

  @Delete(':id/photos/:photoId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Видалити фото (автор або адмін)' })
  deletePhoto(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) id: number,
    @Param('photoId', ParseIntPipe) photoId: number,
  ) {
    return this.bookingsService.deletePhoto(id, photoId, user);
  }
}
