import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('service_categories')
export class ServiceCategory {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  icon: string | null;

  @Column({ default: true })
  isActive: boolean;
}
