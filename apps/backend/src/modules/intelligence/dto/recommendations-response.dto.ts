import { ApiProperty } from '@nestjs/swagger';

export class MasterRecommendationDto {
  @ApiProperty({ example: 1 })
  masterId!: number;

  @ApiProperty({ example: 'Іван Коваль' })
  masterName!: string;

  @ApiProperty({ minimum: 0, maximum: 1, example: 0.82 })
  score!: number;

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
