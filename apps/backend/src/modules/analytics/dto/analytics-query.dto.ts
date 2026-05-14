import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsDateString, IsIn, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class RevenueQueryDto {
  @ApiPropertyOptional({ example: '2026-01-01' })
  @IsOptional() @IsDateString()
  from?: string;

  @ApiPropertyOptional({ example: '2026-12-31' })
  @IsOptional() @IsDateString()
  to?: string;

  @ApiPropertyOptional({ enum: ['day', 'week', 'month'], default: 'month' })
  @IsOptional() @IsIn(['day', 'week', 'month'])
  groupBy?: 'day' | 'week' | 'month' = 'month';
}

export class TopServicesQueryDto {
  @ApiPropertyOptional({ default: 10 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(50)
  limit?: number = 10;
}

export class DateRangeQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsDateString() from?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() to?: string;
}
