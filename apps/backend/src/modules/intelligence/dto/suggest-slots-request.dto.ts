import { IsDateString, IsInt, IsOptional, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class SuggestSlotsRequestDto {
  @ApiProperty({ description: 'Service ID', example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  serviceId!: number;

  @ApiProperty({ description: 'Preferred start date (ISO 8601 date)', example: '2026-05-20' })
  @IsDateString()
  preferredDate!: string;

  @ApiPropertyOptional({ description: 'Vehicle year for age-based duration adjustment', example: 2018 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1900)
  vehicleYear?: number;
}
