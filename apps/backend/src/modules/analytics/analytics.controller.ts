import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { RevenueQueryDto, TopServicesQueryDto, DateRangeQueryDto } from './dto/analytics-query.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';

@ApiTags('Analytics')
@Controller('analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@ApiBearerAuth()
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('summary')
  @ApiOperation({ summary: '[ADMIN] Загальні метрики' })
  getSummary() { return this.analyticsService.getSummary(); }

  @Get('revenue')
  @ApiOperation({ summary: '[ADMIN] Доходи за період' })
  getRevenue(@Query() dto: RevenueQueryDto) { return this.analyticsService.getRevenue(dto); }

  @Get('master-load')
  @ApiOperation({ summary: '[ADMIN] Завантаженість майстрів' })
  getMasterLoad(@Query() dto: DateRangeQueryDto) { return this.analyticsService.getMasterLoad(dto); }

  @Get('top-services')
  @ApiOperation({ summary: '[ADMIN] Топ послуги' })
  getTopServices(@Query() dto: TopServicesQueryDto) { return this.analyticsService.getTopServices(dto); }

  @Get('clients-retention')
  @ApiOperation({ summary: '[ADMIN] Утримання клієнтів' })
  getClientsRetention() { return this.analyticsService.getClientsRetention(); }

  @Get('booking-funnel')
  @ApiOperation({ summary: '[ADMIN] Воронка статусів' })
  getBookingFunnel() { return this.analyticsService.getBookingFunnel(); }
}
