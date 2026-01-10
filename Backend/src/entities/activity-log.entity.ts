import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('activityLogs')
export class ActivityLog {
  @PrimaryGeneratedColumn({ name: 'idActivityLog', type: 'bigint' })
  idActivityLog: number;

  @Column({ name: 'idUser', type: 'bigint' })
  idUser: number;

  @Column({ nullable: true })
  action: string;

  @Column({ nullable: true })
  entity: string;

  @Column({ type: 'bigint', nullable: true })
  entityId: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => User, (user) => user.activityLogs, { onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'idUser' })
  user: User;
}
