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

@Entity('propertyImages')
export class PropertyImage {
  @PrimaryGeneratedColumn({ name: 'idPropertyImage', type: 'bigint' })
  idPropertyImage: number;

  @Column({ name: 'idProperty', type: 'bigint' })
  idProperty: number;

  @Column({ nullable: true })
  image: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => Property, (property) => property.images, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'idProperty' })
  property: Property;
}
