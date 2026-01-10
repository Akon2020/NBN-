import {
  Entity,
  PrimaryColumn,
  OneToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Property } from './property.entity';

@Entity('saleProperties')
export class SaleProperty {
  @PrimaryColumn({ name: 'idProperty', type: 'bigint' })
  idProperty: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToOne(() => Property, (property) => property.saleDetails, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'idProperty' })
  property: Property;
}
