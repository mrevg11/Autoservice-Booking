import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  Matches,
  IsOptional,
} from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'john@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'SecurePass123!', minLength: 8 })
  @IsString()
  @MinLength(8)
  @MaxLength(64)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'Password must contain uppercase, lowercase and number',
  })
  password: string;

  @ApiProperty({ example: 'Іван' })
  @IsString()
  @MinLength(2, { message: "Ім'я має містити мінімум 2 символи" })
  @MaxLength(20, { message: "Ім'я не може перевищувати 20 символів" })
  firstName: string;

  @ApiProperty({ example: 'Петренко' })
  @IsString()
  @MinLength(2, { message: 'Прізвище має містити мінімум 2 символи' })
  @MaxLength(20, { message: 'Прізвище не може перевищувати 20 символів' })
  lastName: string;

  @ApiProperty({ example: '+380991234567', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;
}
