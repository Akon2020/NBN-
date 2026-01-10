import {
  Entity,
  PrimaryColumn,
  Column,
  OneToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Property } from './property.entity';

export enum RentalUnit {
  DAY = 'DAY',
  MONTH = 'MONTH',
  YEAR = 'YEAR',
}

@Entity('rentalProperties')
export class RentalProperty {
  @PrimaryColumn({ name: 'idProperty', type: 'bigint' })
  idProperty: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  guarantee: number;

  @Column({ type: 'enum', enum: RentalUnit })
  unit: RentalUnit;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToOne(() => Property, (property) => property.rentalDetails, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'idProperty' })
  property: Property;
}
