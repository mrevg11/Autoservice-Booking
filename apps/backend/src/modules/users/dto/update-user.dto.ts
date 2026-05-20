import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEmail, MinLength, MaxLength } from 'class-validator';

export class UpdateUserDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2, { message: "Ім'я має містити мінімум 2 символи" })
  @MaxLength(20, { message: "Ім'я не може перевищувати 20 символів" })
  firstName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'Прізвище має містити мінімум 2 символи' })
  @MaxLength(20, { message: 'Прізвище не може перевищувати 20 символів' })
  lastName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail({}, { message: 'Невірний формат email' })
  email?: string;
}
