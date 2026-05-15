export enum Role {
  CLIENT = 'CLIENT',
  MASTER = 'MASTER',
  ADMIN = 'ADMIN',
}

export enum BookingStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export interface UserDto {
  id: number;
  email: string;
  role: Role;
  firstName: string;
  lastName: string;
  phone?: string;
  emailVerified: boolean;
}

export interface BookingDto {
  id: number;
  clientId: number;
  masterId: number;
  vehicleId: number;
  status: BookingStatus;
  scheduledAt: string;
  estimatedDurationMinutes: number;
  totalPrice: number;
  notes?: string;
}

export interface PaginationDto {
  page: number;
  limit: number;
  total: number;
  data: unknown[];
}
