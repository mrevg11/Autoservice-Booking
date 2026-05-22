import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, IsNotEmpty, MinLength, MaxLength, Matches } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'john@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'SecurePass123!', minLength: 8 })
  @IsString()
  @MinLength(8)
  @MaxLength(64)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'Пароль повинен містити велику та малу літери і цифру',
  })
  password: string;

  @ApiProperty({ example: 'Іван' })
  @IsString()
  @MinLength(2, { message: "Ім'я має містити мінімум 2 символи" })
  @MaxLength(20, { message: "Ім'я не може перевищувати 20 символів" })
  @Matches(/^[a-zA-Zа-яА-ЯіІїЇєЄґҐʼ']+$/, { message: "Ім'я може містити лише літери та апостроф" })
  firstName: string;

  @ApiProperty({ example: 'Петренко' })
  @IsString()
  @MinLength(2, { message: 'Прізвище має містити мінімум 2 символи' })
  @MaxLength(20, { message: 'Прізвище не може перевищувати 20 символів' })
  @Matches(/^[a-zA-Zа-яА-ЯіІїЇєЄґҐʼ']+$/, {
    message: 'Прізвище може містити лише літери та апостроф',
  })
  lastName: string;

  @ApiProperty({ example: '+380991234567' })
  @IsNotEmpty({ message: "Номер телефону обов'язковий" })
  @IsString()
  @Matches(/^\+380\d{9}$/, { message: 'Невірний формат. Приклад: +380991234567' })
  phone: string;
}
