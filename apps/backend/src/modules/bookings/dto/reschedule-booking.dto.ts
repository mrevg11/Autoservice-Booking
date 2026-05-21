import { ApiProperty } from '@nestjs/swagger';
import { IsDateString } from 'class-validator';

export class RescheduleBookingDto {
  @ApiProperty({ example: '2026-06-15T10:00:00.000Z' })
  @IsDateString({}, { message: 'Невірний формат дати' })
  scheduledAt: string;
}
