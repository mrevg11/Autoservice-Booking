import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { BookingStatus } from '../../common/enums/booking-status.enum';
import { BookingService } from './booking-service.entity';
import { MasterProfile } from './master-profile.entity';
import { User } from './user.entity';
import { Vehicle } from './vehicle.entity';

@Entity('bookings')
export class Booking {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn()
  client: User | null;

  @Index()
  @ManyToOne(() => MasterProfile, { onDelete: 'RESTRICT' })
  @JoinColumn()
  master: MasterProfile;

  @ManyToOne(() => Vehicle, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn()
  vehicle: Vehicle | null;

  @Index()
  @Column({ type: 'enum', enum: BookingStatus, default: BookingStatus.PENDING })
  status: BookingStatus;

  @Index()
  @Column({ type: 'datetime' })
  scheduledAt: Date;

  @Column({ type: 'int' })
  estimatedDurationMinutes: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  totalPrice: number;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @OneToMany(() => BookingService, (bs) => bs.booking)
  bookingServices: BookingService[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
