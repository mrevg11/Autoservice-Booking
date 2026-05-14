import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('vehicles')
export class Vehicle {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn()
  client: User;

  @Column({ length: 100 })
  make: string;

  @Column({ length: 100 })
  model: string;

  @Column({ type: 'smallint' })
  year: number;

  @Column({ length: 17, nullable: true })
  vin: string | null;

  @Column({ length: 20, nullable: true })
  plateNumber: string | null;
}
