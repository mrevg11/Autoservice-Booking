import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  MinLength,
  MaxLength,
  IsInt,
  Min,
  Max,
  IsOptional,
  Matches,
} from 'class-validator';

export class CreateVehicleDto {
  @ApiProperty({ example: 'Toyota' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  make: string;

  @ApiProperty({ example: 'Camry' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  model: string;

  @ApiProperty({ example: 2020 })
  @IsInt()
  @Min(1900)
  @Max(new Date().getFullYear() + 1)
  year: number;

  @ApiPropertyOptional({ example: 'JT2BF22K1W0123456' })
  @IsOptional()
  @IsString()
  @Matches(/^[A-HJ-NPR-Z0-9]{17}$/, { message: 'Invalid VIN format' })
  vin?: string;

  @ApiPropertyOptional({ example: 'AB1234CD' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  plateNumber?: string;
}
