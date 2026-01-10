import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Proposal } from '../../entities/proposal.entity';
import { Property } from '../../entities/property.entity';
import { CreateProposalDto } from './dto/create-proposal.dto';

@Injectable()
export class ProposalsService {
  constructor(
    @InjectRepository(Proposal)
    private proposalRepository: Repository<Proposal>,
    @InjectRepository(Property)
    private propertyRepository: Repository<Property>,
  ) {}

  async findByProperty(propertyId: number): Promise<Proposal[]> {
    return this.proposalRepository.find({
      where: { idProperty: propertyId },
      order: { createdAt: 'DESC' },
    });
  }

  async findByUser(userId: number): Promise<Proposal[]> {
    const properties = await this.propertyRepository.find({
      where: { idUserCreator: userId },
      select: ['idProperty'],
    });

    const propertyIds = properties.map((p) => p.idProperty);

    if (propertyIds.length === 0) {
      return [];
    }

    return this.proposalRepository
      .createQueryBuilder('proposal')
      .leftJoinAndSelect('proposal.property', 'property')
      .where('proposal.idProperty IN (:...propertyIds)', { propertyIds })
      .orderBy('proposal.createdAt', 'DESC')
      .getMany();
  }

  async create(propertyId: number, createProposalDto: CreateProposalDto): Promise<Proposal> {
    const property = await this.propertyRepository.findOne({
      where: { idProperty: propertyId },
    });

    if (!property) {
      throw new NotFoundException('Propriété non trouvée');
    }

    const proposal = this.proposalRepository.create({
      idProperty: propertyId,
      message: createProposalDto.message,
      sentAt: new Date(),
    });

    return this.proposalRepository.save(proposal);
  }

  async delete(proposalId: number): Promise<void> {
    const result = await this.proposalRepository.delete(proposalId);
    if (result.affected === 0) {
      throw new NotFoundException('Proposition non trouvée');
    }
  }
}
