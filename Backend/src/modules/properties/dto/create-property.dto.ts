import {
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsNumber,
  IsString,
  IsBoolean,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { PropertyCategory, PropertyType } from '../../../entities/property.entity';
import { RentalUnit } from '../../../entities/rental-property.entity';

class RentalDetailsDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  guarantee?: number;

  @ApiProperty({ enum: RentalUnit })
  @IsEnum(RentalUnit)
  unit: RentalUnit;
}

export class CreatePropertyDto {
  @ApiProperty({ enum: PropertyCategory })
  @IsNotEmpty()
  @IsEnum(PropertyCategory)
  category: PropertyCategory;

  @ApiProperty({ enum: PropertyType })
  @IsNotEmpty()
  @IsEnum(PropertyType)
  propertyType: PropertyType;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  quartier?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  avenue?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  fullAddress?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  floors?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  bedrooms?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  livingRooms?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  toilets?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  kitchens?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  price?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  margin?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  latitude?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  longitude?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ required: false, default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  phones?: string[];

  @ApiProperty({ required: false, type: RentalDetailsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => RentalDetailsDto)
  rentalDetails?: RentalDetailsDto;
}
