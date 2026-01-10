import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { User, UserRole } from '../../entities/user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, Between } from 'typeorm';
import { Property, PropertyCategory } from '../../entities/property.entity';
import { PropertyImage } from '../../entities/property-image.entity';
import { PropertyPhone } from '../../entities/property-phone.entity';
import { RentalProperty } from '../../entities/rental-property.entity';
import { SaleProperty } from '../../entities/sale-property.entity';
import { CreatePropertyDto } from './dto/create-property.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';
import { SearchPropertyDto } from './dto/search-property.dto';

@Injectable()
export class PropertiesService {
  constructor(
    @InjectRepository(Property)
    private propertyRepository: Repository<Property>,
    @InjectRepository(PropertyImage)
    private imageRepository: Repository<PropertyImage>,
    @InjectRepository(PropertyPhone)
    private phoneRepository: Repository<PropertyPhone>,
    @InjectRepository(RentalProperty)
    private rentalRepository: Repository<RentalProperty>,
    @InjectRepository(SaleProperty)
    private saleRepository: Repository<SaleProperty>,
  ) {}

  async findAll(searchDto: SearchPropertyDto): Promise<{ data: Property[]; total: number }> {
    const queryBuilder = this.propertyRepository
      .createQueryBuilder('property')
      .leftJoinAndSelect('property.images', 'images')
      .leftJoinAndSelect('property.phones', 'phones')
      .leftJoinAndSelect('property.rentalDetails', 'rentalDetails')
      .leftJoinAndSelect('property.saleDetails', 'saleDetails')
      .leftJoinAndSelect('property.creator', 'creator');

    if (searchDto.category) {
      queryBuilder.andWhere('property.category = :category', { category: searchDto.category });
    }

    if (searchDto.propertyType) {
      queryBuilder.andWhere('property.propertyType = :propertyType', { propertyType: searchDto.propertyType });
    }

    if (searchDto.quartier) {
      queryBuilder.andWhere('property.quartier ILIKE :quartier', { quartier: `%${searchDto.quartier}%` });
    }

    if (searchDto.minPrice !== undefined) {
      queryBuilder.andWhere('property.price >= :minPrice', { minPrice: searchDto.minPrice });
    }

    if (searchDto.maxPrice !== undefined) {
      queryBuilder.andWhere('property.price <= :maxPrice', { maxPrice: searchDto.maxPrice });
    }

    if (searchDto.bedrooms !== undefined) {
      queryBuilder.andWhere('property.bedrooms >= :bedrooms', { bedrooms: searchDto.bedrooms });
    }

    if (searchDto.isActive !== undefined) {
      queryBuilder.andWhere('property.isActive = :isActive', { isActive: searchDto.isActive });
    }

    const page = searchDto.page || 1;
    const limit = searchDto.limit || 10;
    const skip = (page - 1) * limit;

    queryBuilder.skip(skip).take(limit).orderBy('property.createdAt', 'DESC');

    const [data, total] = await queryBuilder.getManyAndCount();

    return { data, total };
  }

  async findOne(id: number): Promise<Property> {
    const property = await this.propertyRepository.findOne({
      where: { idProperty: id },
      relations: ['images', 'phones', 'rentalDetails', 'saleDetails', 'creator', 'score'],
    });

    if (!property) {
      throw new NotFoundException('Propriété non trouvée');
    }

    return property;
  }

  async create(createPropertyDto: CreatePropertyDto, userId: number): Promise<Property> {
    const { phones, rentalDetails, ...propertyData } = createPropertyDto;
    
    const property = this.propertyRepository.create({
      ...propertyData,
      idUserCreator: userId,
    });

    const savedProperty = await this.propertyRepository.save(property);
    const propertyId = Array.isArray(savedProperty) ? savedProperty[0].idProperty : savedProperty.idProperty;

    if (createPropertyDto.category === PropertyCategory.RENT && rentalDetails) {
      const rental = this.rentalRepository.create({
        idProperty: propertyId,
        ...rentalDetails,
      });
      await this.rentalRepository.save(rental);
    }

    if (createPropertyDto.category === PropertyCategory.SALE) {
      const sale = this.saleRepository.create({
        idProperty: propertyId,
      });
      await this.saleRepository.save(sale);
    }

    if (phones && phones.length > 0) {
      for (const phone of phones) {
        const phoneEntity = this.phoneRepository.create({
          idProperty: propertyId,
          phoneNumber: phone,
        });
        await this.phoneRepository.save(phoneEntity);
      }
    }

    return this.findOne(propertyId);
  }

  async update(id: number, updatePropertyDto: UpdatePropertyDto, currentUser: User): Promise<Property> {
    const property = await this.findOne(id);

    if (currentUser.role !== UserRole.ADMIN && property.idUserCreator !== currentUser.idUser) {
      throw new ForbiddenException("Vous n'avez pas le droit de modifier cette propriété");
    }

    Object.assign(property, updatePropertyDto);
    await this.propertyRepository.save(property);

    if (updatePropertyDto.rentalDetails && property.category === PropertyCategory.RENT) {
      await this.rentalRepository.update(
        { idProperty: id },
        updatePropertyDto.rentalDetails,
      );
    }

    return this.findOne(id);
  }

  async delete(id: number, currentUser: User): Promise<void> {
    const property = await this.findOne(id);

    if (currentUser.role !== UserRole.ADMIN && property.idUserCreator !== currentUser.idUser) {
      throw new ForbiddenException("Vous n'avez pas le droit de supprimer cette propriété");
    }

    const result = await this.propertyRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException('Propriété non trouvée');
    }
  }

  async addImages(propertyId: number, imageUrls: string[]): Promise<PropertyImage[]> {
    await this.findOne(propertyId);

    const images: PropertyImage[] = [];
    for (const url of imageUrls) {
      const image = this.imageRepository.create({
        idProperty: propertyId,
        image: url,
      });
      images.push(await this.imageRepository.save(image));
    }

    return images;
  }

  async deleteImage(imageId: number): Promise<void> {
    const result = await this.imageRepository.delete(imageId);
    if (result.affected === 0) {
      throw new NotFoundException('Image non trouvée');
    }
  }
}
