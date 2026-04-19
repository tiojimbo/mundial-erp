import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreatePurchaseOrderDto {
  @ApiProperty({
    example: 'clxyz123...',
    description: 'ID da cotação vencedora (status SELECTED)',
  })
  @IsString()
  @IsNotEmpty()
  quotationId: string;

  @ApiPropertyOptional({
    example: '2026-04-20T00:00:00.000Z',
    description: 'Data prevista de entrega',
  })
  @IsOptional()
  @IsDateString()
  expectedDeliveryDate?: string;

  @ApiPropertyOptional({ example: 'Entrega urgente' })
  @IsOptional()
  @IsString()
  notes?: string;
}
