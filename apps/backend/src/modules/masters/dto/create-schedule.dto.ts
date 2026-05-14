import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, Min, Max, Matches, IsBoolean, IsOptional } from 'class-validator';

export class CreateScheduleDto {
  @ApiProperty({ description: '0=Пн, 6=Нд', minimum: 0, maximum: 6 })
  @IsInt()
  @Min(0)
  @Max(6)
  weekday: number;

  @ApiProperty({ example: '09:00' })
  @Matches(/^\d{2}:\d{2}$/, { message: 'Format: HH:MM' })
  startTime: string;

  @ApiProperty({ example: '18:00' })
  @Matches(/^\d{2}:\d{2}$/, { message: 'Format: HH:MM' })
  endTime: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
