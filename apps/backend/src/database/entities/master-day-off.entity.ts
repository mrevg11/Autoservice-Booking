import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { MasterProfile } from './master-profile.entity';

@Entity('master_days_off')
export class MasterDayOff {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @ManyToOne(() => MasterProfile, { onDelete: 'CASCADE' })
  @JoinColumn()
  master: MasterProfile;

  @Index()
  @Column({ type: 'date' })
  date: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  reason: string | null;
}
