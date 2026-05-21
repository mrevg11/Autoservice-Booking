import { Controller, Get, Post, Body, Param, Query, ParseIntPipe, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '../../common/enums/role.enum';
import { User } from '../../database/entities/user.entity';

@ApiTags('Reviews')
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CLIENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: '[CLIENT] Залишити відгук після завершеного запису' })
  @ApiResponse({ status: 201 })
  @ApiResponse({ status: 400, description: 'Booking not completed' })
  @ApiResponse({ status: 409, description: 'Review already exists' })
  create(@CurrentUser() user: User, @Body() dto: CreateReviewDto) {
    return this.reviewsService.create(user.id, dto);
  }

  @Get('master/:masterId')
  @ApiOperation({ summary: 'Відгуки для майстра' })
  findForMaster(
    @Param('masterId', ParseIntPipe) masterId: number,
    @Query() pagination: PaginationDto,
  ) {
    return this.reviewsService.findForMaster(masterId, pagination);
  }

  @Get('booking/:bookingId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '[Auth] Відгук для конкретного запису' })
  @ApiResponse({ status: 403, description: 'Booking does not belong to you' })
  findForBooking(@CurrentUser() user: User, @Param('bookingId', ParseIntPipe) bookingId: number) {
    return this.reviewsService.findForBooking(bookingId, user);
  }
}
