import { ApiProperty } from '@nestjs/swagger';

export class ServiceDurationBreakdownDto {
  @ApiProperty({ example: 1 })
  serviceId!: number;

  @ApiProperty({ example: 'Заміна оливи та фільтра' })
  serviceName!: string;

  @ApiProperty({ example: 40 })
  baseDurationMinutes!: number;

  @ApiProperty({ example: 53, description: 'Розрахована тривалість з урахуванням коефіцієнтів' })
  estimatedMinutes!: number;
}

export class DurationEstimateMultiResponseDto {
  @ApiProperty({ example: 100, description: 'Сумарна базова тривалість усіх послуг (хв)' })
  totalBaseMinutes!: number;

  @ApiProperty({
    example: 132,
    description: 'Сумарна розрахункова тривалість з урахуванням усіх коефіцієнтів (хв)',
  })
  totalEstimatedMinutes!: number;

  @ApiProperty({ example: 1.2, description: 'Коефіцієнт віку авто [0.95..1.35]' })
  vehicleAgeCoeff!: number;

  @ApiProperty({ example: 1.1, description: 'Сезонний коефіцієнт [0.95..1.1]' })
  seasonCoeff!: number;

  @ApiProperty({ example: 1.0, description: 'Середній коефіцієнт майстра (1.0 = замало даних)' })
  masterCoeff!: number;

  @ApiProperty({ type: [ServiceDurationBreakdownDto] })
  services!: ServiceDurationBreakdownDto[];
}
