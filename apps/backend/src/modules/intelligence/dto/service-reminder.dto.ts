import { ApiProperty } from '@nestjs/swagger';

export class ServiceReminderDto {
  @ApiProperty() serviceId: number;
  @ApiProperty() serviceName: string;
  @ApiProperty() lastServiceDate: string;
  @ApiProperty() nextRecommendedDate: string;
  @ApiProperty() daysOverdue: number;
  @ApiProperty() isOverdue: boolean;
  @ApiProperty() lastBookingId: number;
}

export class ServiceRemindersResponseDto {
  @ApiProperty({ type: [ServiceReminderDto] })
  reminders: ServiceReminderDto[];
}
