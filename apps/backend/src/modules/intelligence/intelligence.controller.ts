import {
  Controller,
  Get,
  Query,
  ParseIntPipe,
  UseGuards,
  Optional,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
  ApiResponse,
} from '@nestjs/swagger';
import { SlotSuggesterService } from './slot-suggester.service';
import { RecommendationsService } from './recommendations.service';
import { DurationPredictorService } from './duration-predictor.service';
import { SuggestSlotsRequestDto } from './dto/suggest-slots-request.dto';
import { SuggestSlotsResponseDto } from './dto/suggest-slots-response.dto';
import { RecommendationsResponseDto } from './dto/recommendations-response.dto';
import { DurationEstimateResponseDto } from './dto/duration-estimate-response.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../../database/entities/user.entity';

@ApiTags('Intelligence')
@Controller('intelligence')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class IntelligenceController {
  constructor(
    private readonly slotSuggesterService: SlotSuggesterService,
    private readonly recommendationsService: RecommendationsService,
    private readonly durationPredictorService: DurationPredictorService,
  ) {}

  @Get('suggest-slots')
  @ApiOperation({ summary: 'Підбір оптимальних слотів для запису (weighted scoring)' })
  @ApiResponse({ status: 200, type: SuggestSlotsResponseDto })
  async suggestSlots(
    @Query() query: SuggestSlotsRequestDto,
    @CurrentUser() _user: User,
  ): Promise<SuggestSlotsResponseDto> {
    const estimate = await this.durationPredictorService.predict(
      query.serviceId,
      undefined,
      query.vehicleYear,
    );
    const allServiceIds = query.serviceIds
      ? query.serviceIds.split(',').map(Number).filter(Boolean)
      : [query.serviceId];
    const suggestions = await this.slotSuggesterService.suggestSlots(
      query.serviceId,
      new Date(query.preferredDate),
      estimate.estimatedMinutes,
      allServiceIds,
    );
    return { suggestions, estimatedDurationMinutes: estimate.estimatedMinutes };
  }

  @Get('recommendations')
  @ApiOperation({ summary: 'Рекомендовані майстри для послуги (hybrid algorithm)' })
  @ApiQuery({ name: 'serviceId', type: Number })
  @ApiResponse({ status: 200, type: RecommendationsResponseDto })
  async getRecommendations(
    @Query('serviceId', ParseIntPipe) serviceId: number,
    @CurrentUser() user: User,
  ): Promise<RecommendationsResponseDto> {
    const recommendations = await this.recommendationsService.recommend(user.id, serviceId);
    return { recommendations };
  }

  @Get('estimate-duration')
  @ApiOperation({ summary: 'Оцінка тривалості послуги (coefficient-based)' })
  @ApiQuery({ name: 'serviceId', type: Number })
  @ApiQuery({ name: 'masterId', type: Number })
  @ApiQuery({ name: 'vehicleYear', required: false, type: Number })
  @ApiResponse({ status: 200, type: DurationEstimateResponseDto })
  async estimateDuration(
    @Query('serviceId', ParseIntPipe) serviceId: number,
    @Query('masterId', ParseIntPipe) masterId: number,
    @Query('vehicleYear') @Optional() vehicleYear?: string,
  ): Promise<DurationEstimateResponseDto> {
    return this.durationPredictorService.predict(
      serviceId,
      masterId,
      vehicleYear !== undefined ? parseInt(vehicleYear, 10) : undefined,
    );
  }
}
