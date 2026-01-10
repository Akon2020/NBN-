import { IsNotEmpty, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateFavoriteDto {
  @ApiProperty({ description: 'ID de la propriété' })
  @IsNotEmpty({ message: "L'ID de la propriété est requis" })
  @IsNumber()
  idProperty: number;
}
