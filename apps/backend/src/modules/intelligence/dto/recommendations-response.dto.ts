import { ApiProperty } from '@nestjs/swagger';

export class MasterRecommendationDto {
  @ApiProperty({ example: 1 })
  masterId!: number;

  @ApiProperty({ example: 'Іван Коваль' })
  masterName!: string;

  @ApiProperty({ minimum: 0, maximum: 1, example: 0.82 })
  score!: number;

  @ApiProperty({ example: 4.7 })
  rating!: number;

  @ApiProperty({ example: 5 })
  experienceYears!: number;

  @ApiProperty({ example: 'Двигуни, ходова' })
  specialization!: string;

  @ApiProperty({
    type: [String],
    example: [
      'Рейтинг: 95%',
      'Особистий досвід: 100%',
      'Досвід роботи: 80%',
      'Завантаженість: 100%',
      'Спеціалізація: 100%',
    ],
  })
  reasons!: string[];
}

export class RecommendationsResponseDto {
  @ApiProperty({ type: [MasterRecommendationDto] })
  recommendations!: MasterRecommendationDto[];
}
