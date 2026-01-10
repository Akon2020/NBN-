import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProposalsService } from './proposals.service';
import { ProposalsController } from './proposals.controller';
import { Proposal } from '../../entities/proposal.entity';
import { Property } from '../../entities/property.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Proposal, Property])],
  controllers: [ProposalsController],
  providers: [ProposalsService],
  exports: [ProposalsService],
})
export class ProposalsModule {}
