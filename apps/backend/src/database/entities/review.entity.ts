import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Booking } from './booking.entity';

@Entity('reviews')
export class Review {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToOne(() => Booking, { onDelete: 'CASCADE' })
  @JoinColumn()
  booking: Booking;

  @Column({ type: 'tinyint', unsigned: true })
  rating: number; // 1–5

  @Column({ type: 'text', nullable: true })
  comment: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
