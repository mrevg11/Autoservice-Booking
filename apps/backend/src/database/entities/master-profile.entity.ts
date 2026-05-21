import { Column, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn } from 'typeorm';
import { User } from './user.entity';

@Entity('master_profiles')
export class MasterProfile {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn()
  user: User;

  @Column({ type: 'varchar', length: 200, nullable: true })
  specialization: string | null;

  @Column({ type: 'int', default: 0 })
  experienceYears: number;

  @Column({ type: 'decimal', precision: 3, scale: 2, default: '0.00' })
  rating: number;

  @Column({ type: 'varchar', length: 500, nullable: true })
  photo: string | null;

  @Column({ type: 'text', nullable: true })
  bio: string | null;
}
