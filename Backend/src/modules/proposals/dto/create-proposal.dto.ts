import { IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateProposalDto {
  @ApiProperty({ description: 'Message de la proposition', required: false })
  @IsOptional()
  @IsString()
  message?: string;
}
