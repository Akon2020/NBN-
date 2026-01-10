import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { PropertyImage } from './property-image.entity';
import { PropertyPhone } from './property-phone.entity';
import { RentalProperty } from './rental-property.entity';
import { SaleProperty } from './sale-property.entity';
import { Favorite } from './favorite.entity';
import { Proposal } from './proposal.entity';
import { PropertyScore } from './property-score.entity';

export enum PropertyCategory {
  RENT = 'RENT',
  SALE = 'SALE',
}

export enum PropertyType {
  APPARTEMENT = 'APPARTEMENT',
  MAISON = 'MAISON',
  CONSTRUCTION_DURABLE = 'CONSTRUCTION_DURABLE',
  CONSTRUCTION_SEMI_DURABLE = 'CONSTRUCTION_SEMI_DURABLE',
  TERRAIN_PLAT = 'TERRAIN_PLAT',
  TERRAIN_PENTE = 'TERRAIN_PENTE',
}

@Entity('properties')
export class Property {
  @PrimaryGeneratedColumn({ name: 'idProperty', type: 'bigint' })
  idProperty: number;

  @Column({ type: 'enum', enum: PropertyCategory })
  category: PropertyCategory;

  @Column({ type: 'enum', enum: PropertyType })
  propertyType: PropertyType;

  @Column({ nullable: true })
  quartier: string;

  @Column({ nullable: true })
  avenue: string;

  @Column({ nullable: true })
  fullAddress: string;

  @Column({ type: 'int', nullable: true })
  floors: number;

  @Column({ type: 'int', nullable: true })
  bedrooms: number;

  @Column({ type: 'int', nullable: true })
  livingRooms: number;

  @Column({ type: 'int', nullable: true })
  toilets: number;

  @Column({ type: 'int', nullable: true })
  kitchens: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  price: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  margin: number;

  @Column({ type: 'decimal', precision: 10, scale: 8, nullable: true })
  latitude: number;

  @Column({ type: 'decimal', precision: 11, scale: 8, nullable: true })
  longitude: number;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ name: 'idUserCreator', nullable: true })
  idUserCreator: number;

  @ManyToOne(() => User, (user) => user.properties, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'idUserCreator' })
  creator: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => PropertyImage, (image) => image.property)
  images: PropertyImage[];

  @OneToMany(() => PropertyPhone, (phone) => phone.property)
  phones: PropertyPhone[];

  @OneToOne(() => RentalProperty, (rental) => rental.property)
  rentalDetails: RentalProperty;

  @OneToOne(() => SaleProperty, (sale) => sale.property)
  saleDetails: SaleProperty;

  @OneToMany(() => Favorite, (favorite) => favorite.property)
  favorites: Favorite[];

  @OneToMany(() => Proposal, (proposal) => proposal.property)
  proposals: Proposal[];

  @OneToOne(() => PropertyScore, (score) => score.property)
  score: PropertyScore;
}
