import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { MasterProfile } from './master-profile.entity';

@Entity('master_schedules')
export class MasterSchedule {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @ManyToOne(() => MasterProfile, { onDelete: 'CASCADE' })
  @JoinColumn()
  master: MasterProfile;

  @Column({ type: 'tinyint' })
  weekday: number; // 0=Пн, 6=Нд

  @Column({ type: 'time' })
  startTime: string;

  @Column({ type: 'time' })
  endTime: string;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;
}
