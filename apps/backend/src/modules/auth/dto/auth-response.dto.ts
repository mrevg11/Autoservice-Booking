import { ApiProperty } from '@nestjs/swagger';

export class AuthResponseDto {
  @ApiProperty()
  accessToken: string;

  @ApiProperty()
  user: {
    id: number;
    email: string;
    role: string;
    firstName: string;
    lastName: string;
    emailVerified: boolean;
  };
}
