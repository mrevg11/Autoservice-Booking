import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { BookingStatus } from '../../common/enums/booking-status.enum';
import { Booking } from './booking.entity';
import { User } from './user.entity';

@Entity('booking_status_history')
export class BookingStatusHistory {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @ManyToOne(() => Booking, { onDelete: 'CASCADE' })
  @JoinColumn()
  booking: Booking;

  // null means initial creation (no previous status)
  @Column({ type: 'enum', enum: BookingStatus, nullable: true })
  oldStatus: BookingStatus | null;

  @Column({ type: 'enum', enum: BookingStatus })
  newStatus: BookingStatus;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn()
  changedBy: User | null;

  @CreateDateColumn()
  changedAt: Date;
}
