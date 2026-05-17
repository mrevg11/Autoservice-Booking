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
  ValidateIf,
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
  @Max(new Date().getFullYear())
  year: number;

  @ApiPropertyOptional({ example: 'JT2BF22K1W0123456' })
  @IsOptional()
  @ValidateIf((o: CreateVehicleDto) => !!o.vin)
  @IsString()
  @Matches(/^[A-HJ-NPR-Z0-9]{17}$/, { message: 'VIN має складатися з 17 символів (латиниця та цифри)' })
  vin?: string;

  @ApiPropertyOptional({ example: 'AB1234CD' })
  @IsOptional()
  @IsString()
  @Matches(/^[A-ZА-ЯІЇЄ]{2}\d{4}[A-ZА-ЯІЇЄ]{2}$/i, { message: 'Формат номера: АА1234АА' })
  plateNumber?: string;
}
