import { ApiProperty } from '@nestjs/swagger';

export class SlotSuggestionDto {
  @ApiProperty({ example: 1 })
  masterId!: number;

  @ApiProperty({ example: 'Іван Коваль' })
  masterName!: string;

  @ApiProperty({ example: '2026-05-20T10:00:00.000Z' })
  startAt!: string;

  @ApiProperty({ example: '2026-05-20T10:40:00.000Z' })
  endAt!: string;

  @ApiProperty({ minimum: 0, maximum: 1, example: 0.87 })
  score!: number;

  @ApiProperty({ type: [String], example: ['Рейтинг майстра: 95%', 'Доступність слоту: 90%'] })
  reasons!: string[];
}

export class SuggestSlotsResponseDto {
  @ApiProperty({ type: [SlotSuggestionDto] })
  suggestions!: SlotSuggestionDto[];

  @ApiProperty({ example: 40 })
  estimatedDurationMinutes!: number;
}
