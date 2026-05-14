import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MasterProfile } from '../../database/entities/master-profile.entity';
import { MasterSchedule } from '../../database/entities/master-schedule.entity';
import { MasterDayOff } from '../../database/entities/master-day-off.entity';
import { Booking } from '../../database/entities/booking.entity';
import { Service } from '../../database/entities/service.entity';
import { MasterService } from '../../database/entities/master-service.entity';
import { BookingService as BookingServiceEntity } from '../../database/entities/booking-service.entity';
import { Review } from '../../database/entities/review.entity';
import { IntelligenceController } from './intelligence.controller';
import { SlotSuggesterService } from './slot-suggester.service';
import { RecommendationsService } from './recommendations.service';
import { DurationPredictorService } from './duration-predictor.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      MasterProfile,
      MasterSchedule,
      MasterDayOff,
      Booking,
      Service,
      MasterService,
      BookingServiceEntity,
      Review,
    ]),
  ],
  controllers: [IntelligenceController],
  providers: [SlotSuggesterService, RecommendationsService, DurationPredictorService],
})
export class IntelligenceModule {}
