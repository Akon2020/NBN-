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

@Entity('propertyPhones')
export class PropertyPhone {
  @PrimaryGeneratedColumn({ name: 'idPropertyPhone', type: 'bigint' })
  idPropertyPhone: number;

  @Column({ name: 'idProperty', type: 'bigint' })
  idProperty: number;

  @Column({ length: 20 })
  phoneNumber: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => Property, (property) => property.phones, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'idProperty' })
  property: Property;
}
