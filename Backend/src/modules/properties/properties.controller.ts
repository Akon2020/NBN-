import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
  ParseIntPipe,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { diskStorage } from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { extname } from 'path';
import { PropertiesService } from './properties.service';
import { CreatePropertyDto } from './dto/create-property.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';
import { SearchPropertyDto } from './dto/search-property.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../../entities/user.entity';

@ApiTags('Propriétés')
@Controller('api/properties')
export class PropertiesController {
  constructor(private readonly propertiesService: PropertiesService) {}

  @Get()
  @ApiOperation({ summary: 'Lister toutes les propriétés avec filtres' })
  @ApiResponse({ status: 200, description: 'Liste des propriétés' })
  async findAll(@Query() searchDto: SearchPropertyDto) {
    return this.propertiesService.findAll(searchDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtenir une propriété par ID' })
  @ApiResponse({ status: 200, description: 'Propriété trouvée' })
  @ApiResponse({ status: 404, description: 'Propriété non trouvée' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.propertiesService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Créer une nouvelle propriété' })
  @ApiResponse({ status: 201, description: 'Propriété créée' })
  async create(@Body() createPropertyDto: CreatePropertyDto, @CurrentUser() user: User) {
    return this.propertiesService.create(createPropertyDto, user.idUser);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mettre à jour une propriété' })
  @ApiResponse({ status: 200, description: 'Propriété mise à jour' })
  @ApiResponse({ status: 403, description: 'Non autorisé à modifier cette propriété' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updatePropertyDto: UpdatePropertyDto,
    @CurrentUser() user: User,
  ) {
    return this.propertiesService.update(id, updatePropertyDto, user);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Supprimer une propriété' })
  @ApiResponse({ status: 200, description: 'Propriété supprimée' })
  @ApiResponse({ status: 403, description: 'Non autorisé à supprimer cette propriété' })
  async delete(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: User) {
    await this.propertiesService.delete(id, user);
    return { message: 'Propriété supprimée avec succès' };
  }

  @Post(':id/images')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Ajouter des images à une propriété' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FilesInterceptor('images', 10, {
      storage: diskStorage({
        destination: './uploads/properties',
        filename: (req, file, cb) => {
          const uniqueSuffix = uuidv4();
          cb(null, `${uniqueSuffix}${extname(file.originalname)}`);
        },
      }),
    }),
  )
  async addImages(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    const imageUrls = files.map((file) => `/uploads/properties/${file.filename}`);
    return this.propertiesService.addImages(id, imageUrls);
  }

  @Delete('images/:imageId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Supprimer une image' })
  async deleteImage(@Param('imageId', ParseIntPipe) imageId: number) {
    await this.propertiesService.deleteImage(imageId);
    return { message: 'Image supprimée avec succès' };
  }
}
