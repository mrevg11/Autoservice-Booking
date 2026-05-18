import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateBookingPhotoDto {
  @ApiProperty({ description: 'Base64 dataUrl (data:image/jpeg;base64,...)' })
  @IsString()
  dataUrl: string;

  @ApiProperty({ example: 'image/jpeg' })
  @IsString()
  @MaxLength(50)
  mimeType: string;

  @ApiPropertyOptional({ example: 'Стан до ремонту' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  caption?: string;
}
