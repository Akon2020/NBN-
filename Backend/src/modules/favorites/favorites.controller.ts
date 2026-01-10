import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { FavoritesService } from './favorites.service';
import { CreateFavoriteDto } from './dto/create-favorite.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../../entities/user.entity';

@ApiTags('Favoris')
@Controller('api')
export class FavoritesController {
  constructor(private readonly favoritesService: FavoritesService) {}

  @Get('users/:userId/favorites')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Obtenir les favoris d'un utilisateur" })
  @ApiResponse({ status: 200, description: 'Liste des favoris' })
  async findByUser(@Param('userId', ParseIntPipe) userId: number) {
    return this.favoritesService.findByUser(userId);
  }

  @Post('users/:userId/favorites')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Ajouter une propriété aux favoris' })
  @ApiResponse({ status: 201, description: 'Favori ajouté' })
  @ApiResponse({ status: 409, description: 'Déjà dans les favoris' })
  async create(
    @Param('userId', ParseIntPipe) userId: number,
    @Body() createFavoriteDto: CreateFavoriteDto,
    @CurrentUser() user: User,
  ) {
    return this.favoritesService.create(userId, createFavoriteDto);
  }

  @Delete('favorites/:favoriteId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Supprimer un favori' })
  @ApiResponse({ status: 200, description: 'Favori supprimé' })
  async delete(
    @Param('favoriteId', ParseIntPipe) favoriteId: number,
    @CurrentUser() user: User,
  ) {
    await this.favoritesService.delete(favoriteId, user.idUser);
    return { message: 'Favori supprimé avec succès' };
  }
}
