import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PropertiesService } from './properties.service';
import { PropertiesController } from './properties.controller';
import { Property } from '../../entities/property.entity';
import { PropertyImage } from '../../entities/property-image.entity';
import { PropertyPhone } from '../../entities/property-phone.entity';
import { RentalProperty } from '../../entities/rental-property.entity';
import { SaleProperty } from '../../entities/sale-property.entity';
import { PropertyScore } from '../../entities/property-score.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Property,
      PropertyImage,
      PropertyPhone,
      RentalProperty,
      SaleProperty,
      PropertyScore,
    ]),
  ],
  controllers: [PropertiesController],
  providers: [PropertiesService],
  exports: [PropertiesService],
})
export class PropertiesModule {}
