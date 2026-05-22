import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { User } from '../../database/entities/user.entity';
import { MasterProfile } from '../../database/entities/master-profile.entity';
import { MasterSchedule } from '../../database/entities/master-schedule.entity';
import { Booking } from '../../database/entities/booking.entity';
import { Vehicle } from '../../database/entities/vehicle.entity';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, MasterProfile, MasterSchedule, Booking, Vehicle]),
    MailModule,
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
