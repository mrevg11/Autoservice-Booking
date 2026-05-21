import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Booking } from './booking.entity';
import { Service } from './service.entity';

@Entity('booking_services')
export class BookingService {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Booking, (b) => b.bookingServices, { onDelete: 'CASCADE' })
  @JoinColumn()
  booking: Booking;

  @ManyToOne(() => Service, { onDelete: 'RESTRICT' })
  @JoinColumn()
  service: Service;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  actualPrice: number;

  @Column({ type: 'int', nullable: true })
  actualDurationMinutes: number | null;
}
