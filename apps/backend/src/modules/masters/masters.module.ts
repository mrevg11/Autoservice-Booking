import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MasterProfile } from '../../database/entities/master-profile.entity';
import { MasterSchedule } from '../../database/entities/master-schedule.entity';
import { MasterDayOff } from '../../database/entities/master-day-off.entity';
import { MasterService as MasterServiceEntity } from '../../database/entities/master-service.entity';
import { Service } from '../../database/entities/service.entity';
import { Booking } from '../../database/entities/booking.entity';
import { MastersController } from './masters.controller';
import { MastersService } from './masters.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      MasterProfile,
      MasterSchedule,
      MasterDayOff,
      MasterServiceEntity,
      Service,
      Booking,
    ]),
  ],
  controllers: [MastersController],
  providers: [MastersService],
  exports: [MastersService],
})
export class MastersModule {}
