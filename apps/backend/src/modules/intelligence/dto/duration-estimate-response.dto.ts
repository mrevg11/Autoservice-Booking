import { ApiProperty } from '@nestjs/swagger';

export class DurationEstimateResponseDto {
  @ApiProperty({ example: 1 })
  serviceId!: number;

  @ApiProperty({ example: 1 })
  masterId!: number;

  @ApiProperty({ example: 44, description: 'Розрахована тривалість у хвилинах' })
  estimatedMinutes!: number;

  @ApiProperty({ example: 40 })
  baseDurationMinutes!: number;

  @ApiProperty({ example: 1.0, description: 'Коефіцієнт майстра [0.5..2.0], 1.0 = fallback' })
  masterCoeff!: number;

  @ApiProperty({ example: 1.1, description: 'Коефіцієнт віку авто [0.95..1.35]' })
  vehicleAgeCoeff!: number;

  @ApiProperty({ example: 1.0, description: 'Сезонний коефіцієнт [0.95..1.1]' })
  seasonCoeff!: number;
}
