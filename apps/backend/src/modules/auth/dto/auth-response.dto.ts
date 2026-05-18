import { ApiProperty } from '@nestjs/swagger';

export class AuthResponseDto {
  @ApiProperty()
  accessToken: string;

  /** Populated by AuthService; stripped by the controller before sending — set as httpOnly cookie instead. */
  refreshToken?: string;

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
