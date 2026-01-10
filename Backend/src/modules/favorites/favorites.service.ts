import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Favorite } from '../../entities/favorite.entity';
import { Property } from '../../entities/property.entity';
import { CreateFavoriteDto } from './dto/create-favorite.dto';

@Injectable()
export class FavoritesService {
  constructor(
    @InjectRepository(Favorite)
    private favoriteRepository: Repository<Favorite>,
    @InjectRepository(Property)
    private propertyRepository: Repository<Property>,
  ) {}

  async findByUser(userId: number): Promise<Favorite[]> {
    return this.favoriteRepository.find({
      where: { idUser: userId },
      relations: ['property', 'property.images'],
      order: { createdAt: 'DESC' },
    });
  }

  async create(userId: number, createFavoriteDto: CreateFavoriteDto): Promise<Favorite> {
    const property = await this.propertyRepository.findOne({
      where: { idProperty: createFavoriteDto.idProperty },
    });

    if (!property) {
      throw new NotFoundException('Propriété non trouvée');
    }

    const existingFavorite = await this.favoriteRepository.findOne({
      where: { idUser: userId, idProperty: createFavoriteDto.idProperty },
    });

    if (existingFavorite) {
      throw new ConflictException('Cette propriété est déjà dans vos favoris');
    }

    const favorite = this.favoriteRepository.create({
      idUser: userId,
      idProperty: createFavoriteDto.idProperty,
      madeAt: new Date(),
    });

    return this.favoriteRepository.save(favorite);
  }

  async delete(favoriteId: number, userId: number): Promise<void> {
    const favorite = await this.favoriteRepository.findOne({
      where: { idFavorite: favoriteId, idUser: userId },
    });

    if (!favorite) {
      throw new NotFoundException('Favori non trouvé');
    }

    await this.favoriteRepository.remove(favorite);
  }

  async deleteByProperty(userId: number, propertyId: number): Promise<void> {
    const favorite = await this.favoriteRepository.findOne({
      where: { idUser: userId, idProperty: propertyId },
    });

    if (!favorite) {
      throw new NotFoundException('Favori non trouvé');
    }

    await this.favoriteRepository.remove(favorite);
  }
}
