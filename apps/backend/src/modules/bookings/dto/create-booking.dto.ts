import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsPositive,
  IsDateString,
  IsArray,
  ArrayMinSize,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  Max,
} from 'class-validator';

export class CreateBookingDto {
  @ApiProperty({ description: 'ID майстра' })
  @IsInt()
  @IsPositive()
  masterId: number;

  @ApiProperty({ description: 'ID автомобіля клієнта' })
  @IsInt()
  @IsPositive()
  vehicleId: number;

  @ApiProperty({ description: 'Дата і час запису', example: '2026-06-01T10:00:00' })
  @IsDateString()
  scheduledAt: string;

  @ApiProperty({ description: 'ID послуг', type: [Number] })
  @IsArray()
  @ArrayMinSize(1)
  @IsInt({ each: true })
  @IsPositive({ each: true })
  serviceIds: number[];

  @ApiPropertyOptional({ description: 'Орієнтовна тривалість з урахуванням коефіцієнтів (хв). Якщо не передано — розраховується як сума базових тривалостей послуг.' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(600)
  estimatedDurationMinutes?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(300, { message: 'Нотатки не можуть перевищувати 300 символів' })
  notes?: string;
}
