import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
} from 'typeorm';
import { User } from './user.entity';
import { Property } from './property.entity';

@Entity('favorites')
@Unique(['idUser', 'idProperty'])
export class Favorite {
  @PrimaryGeneratedColumn({ name: 'idFavorite', type: 'bigint' })
  idFavorite: number;

  @Column({ name: 'idUser', type: 'bigint' })
  idUser: number;

  @Column({ name: 'idProperty', type: 'bigint' })
  idProperty: number;

  @Column({ nullable: true })
  madeAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => User, (user) => user.favorites, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'idUser' })
  user: User;

  @ManyToOne(() => Property, (property) => property.favorites, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'idProperty' })
  property: Property;
}
