import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Role } from '../../common/enums/role.enum';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({ unique: true, length: 255 })
  email: string;

  @Column({ length: 255 })
  passwordHash: string;

  @Column({ type: 'enum', enum: Role, default: Role.CLIENT })
  role: Role;

  @Column({ length: 100 })
  firstName: string;

  @Column({ length: 100 })
  lastName: string;

  @Column({ length: 20, nullable: true })
  phone: string | null;

  @Column({ default: false })
  emailVerified: boolean;

  @Column({ length: 255, nullable: true })
  emailVerificationToken: string | null;

  @Column({ length: 255, nullable: true })
  passwordResetToken: string | null;

  @Column({ type: 'datetime', nullable: true })
  passwordResetExpires: Date | null;

  @Column({ length: 500, nullable: true })
  refreshTokenHash: string | null;

  @Column({ default: false })
  isBlocked: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
