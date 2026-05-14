import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { MasterProfile } from './master-profile.entity';
import { Service } from './service.entity';

@Entity('master_services')
@Unique(['master', 'service'])
export class MasterService {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => MasterProfile, { onDelete: 'CASCADE' })
  @JoinColumn()
  master: MasterProfile;

  @ManyToOne(() => Service, { onDelete: 'CASCADE' })
  @JoinColumn()
  service: Service;

  @Column({ type: 'decimal', precision: 4, scale: 2, default: '1.00' })
  priceCoefficient: number;
}
