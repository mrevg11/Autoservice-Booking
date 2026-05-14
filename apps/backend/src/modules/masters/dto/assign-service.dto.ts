import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsPositive, IsOptional, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class AssignServiceDto {
  @ApiProperty()
  @IsInt()
  @IsPositive()
  serviceId: number;

  @ApiPropertyOptional({ default: 1.0, description: 'Коефіцієнт ціни (0.5–3.0)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.5)
  @Max(3.0)
  priceCoefficient?: number;
}
