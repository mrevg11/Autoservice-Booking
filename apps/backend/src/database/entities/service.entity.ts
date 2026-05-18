import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ServiceCategory } from './service-category.entity';

@Entity('services')
export class Service {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @ManyToOne(() => ServiceCategory, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn()
  category: ServiceCategory | null;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  basePrice: number;

  @Column({ type: 'int' })
  baseDurationMinutes: number;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'int', nullable: true, default: 180 })
  recommendedIntervalDays: number | null;
}
