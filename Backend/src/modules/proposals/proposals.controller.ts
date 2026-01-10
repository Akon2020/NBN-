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
import { ProposalsService } from './proposals.service';
import { CreateProposalDto } from './dto/create-proposal.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../../entities/user.entity';

@ApiTags('Propositions')
@Controller('api')
export class ProposalsController {
  constructor(private readonly proposalsService: ProposalsService) {}

  @Post('properties/:propertyId/proposals')
  @ApiOperation({ summary: 'Créer une proposition pour une propriété' })
  @ApiResponse({ status: 201, description: 'Proposition créée' })
  async create(
    @Param('propertyId', ParseIntPipe) propertyId: number,
    @Body() createProposalDto: CreateProposalDto,
  ) {
    return this.proposalsService.create(propertyId, createProposalDto);
  }

  @Get('users/:userId/proposals')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Obtenir les propositions reçues par un utilisateur" })
  @ApiResponse({ status: 200, description: 'Liste des propositions' })
  async findByUser(@Param('userId', ParseIntPipe) userId: number) {
    return this.proposalsService.findByUser(userId);
  }

  @Get('properties/:propertyId/proposals')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Obtenir les propositions d'une propriété" })
  @ApiResponse({ status: 200, description: 'Liste des propositions' })
  async findByProperty(@Param('propertyId', ParseIntPipe) propertyId: number) {
    return this.proposalsService.findByProperty(propertyId);
  }

  @Delete('proposals/:proposalId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Supprimer une proposition' })
  @ApiResponse({ status: 200, description: 'Proposition supprimée' })
  async delete(@Param('proposalId', ParseIntPipe) proposalId: number) {
    await this.proposalsService.delete(proposalId);
    return { message: 'Proposition supprimée avec succès' };
  }
}
