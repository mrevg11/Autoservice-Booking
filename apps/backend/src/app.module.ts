import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import databaseConfig from './config/database.config';
import intelligenceConfig from './config/intelligence.config';
import jwtConfig from './config/jwt.config';
import { AppController } from './app.controller';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { MailModule } from './modules/mail/mail.module';
import { ServicesModule } from './modules/services/services.module';
import { MastersModule } from './modules/masters/masters.module';
import { VehiclesModule } from './modules/vehicles/vehicles.module';
import { BookingsModule } from './modules/bookings/bookings.module';
import { ReviewsModule } from './modules/reviews/reviews.module';
import { IntelligenceModule } from './modules/intelligence/intelligence.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import {
  Booking,
  BookingService,
  BookingStatusHistory,
  ClientProfile,
  MasterDayOff,
  MasterProfile,
  MasterSchedule,
  MasterService,
  Notification,
  Review,
  Service,
  ServiceCategory,
  User,
  Vehicle,
} from './database/entities';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig, jwtConfig, intelligenceConfig],
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'mysql',
        host: config.get<string>('database.host'),
        port: config.get<number>('database.port'),
        database: config.get<string>('database.name'),
        username: config.get<string>('database.username'),
        password: config.get<string>('database.password'),
        synchronize: config.get<boolean>('database.synchronize'),
        logging: config.get<boolean>('database.logging'),
        entities: [
          User, ClientProfile, MasterProfile, MasterSchedule,
          MasterDayOff, ServiceCategory, Service, MasterService,
          Vehicle, Booking, BookingService, BookingStatusHistory,
          Review, Notification,
        ],
        migrations: [__dirname + '/database/migrations/*{.ts,.js}'],
        charset: 'utf8mb4',
      }),
    }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    ScheduleModule.forRoot(),
    AuthModule,
    UsersModule,
    MailModule,
    ServicesModule,
    MastersModule,
    VehiclesModule,
    BookingsModule,
    ReviewsModule,
    IntelligenceModule,
    AnalyticsModule,
    NotificationsModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
