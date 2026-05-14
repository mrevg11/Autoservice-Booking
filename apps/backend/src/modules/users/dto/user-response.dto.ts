import { ApiProperty } from '@nestjs/swagger';
import { Role } from '../../../common/enums/role.enum';

export class UserResponseDto {
  @ApiProperty() id: number;
  @ApiProperty() email: string;
  @ApiProperty({ enum: Role }) role: Role;
  @ApiProperty() firstName: string;
  @ApiProperty() lastName: string;
  @ApiProperty() phone: string | null;
  @ApiProperty() emailVerified: boolean;
  @ApiProperty() isBlocked: boolean;
  @ApiProperty() createdAt: Date;
}

export function toUserResponse(user: {
  id: number;
  email: string;
  role: Role;
  firstName: string;
  lastName: string;
  phone: string | null;
  emailVerified: boolean;
  isBlocked: boolean;
  createdAt: Date;
}): UserResponseDto {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone,
    emailVerified: user.emailVerified,
    isBlocked: user.isBlocked,
    createdAt: user.createdAt,
  };
}
