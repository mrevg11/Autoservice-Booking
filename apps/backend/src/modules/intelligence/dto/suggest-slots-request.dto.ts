import { IsDateString, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class SuggestSlotsRequestDto {
  @ApiProperty({ description: 'Primary service ID (used for duration estimation)', example: 1 })
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

  @ApiPropertyOptional({ description: 'Comma-separated IDs of all selected services (for multi-service master filtering)', example: '1,2' })
  @IsOptional()
  @IsString()
  serviceIds?: string;

  @ApiPropertyOptional({ description: 'Vehicle ID — filters out slots where the vehicle already has another booking', example: 3 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  vehicleId?: number;
}
