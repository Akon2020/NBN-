import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Property } from './property.entity';

@Entity('proposals')
export class Proposal {
  @PrimaryGeneratedColumn({ name: 'idProposal', type: 'bigint' })
  idProposal: number;

  @Column({ name: 'idProperty', type: 'bigint' })
  idProperty: number;

  @Column({ type: 'text', nullable: true })
  message: string;

  @Column({ nullable: true })
  sentAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => Property, (property) => property.proposals, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'idProperty' })
  property: Property;
}
