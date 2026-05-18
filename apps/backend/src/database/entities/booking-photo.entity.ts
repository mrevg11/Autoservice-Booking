import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Booking } from './booking.entity';
import { User } from './user.entity';

@Entity('booking_photos')
@Index(['booking'])
export class BookingPhoto {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Booking, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'bookingId' })
  booking: Booking;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'uploadedById' })
  uploadedBy: User | null;

  @Column({ type: 'mediumtext' })
  dataUrl: string;

  @Column({ type: 'varchar', length: 50 })
  mimeType: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  caption: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
