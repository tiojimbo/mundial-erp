import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreatePurchaseQuotationItemDto } from './create-purchase-quotation-item.dto';

export class UpdatePurchaseQuotationDto {
  @ApiPropertyOptional({
    enum: ['DRAFT', 'SENT', 'RECEIVED'],
    description: 'Status da cotação',
  })
  @IsOptional()
  @IsIn(['DRAFT', 'SENT', 'RECEIVED'])
  status?: string;

  @ApiPropertyOptional({
    example: '2026-04-10T00:00:00.000Z',
    description: 'Data de recebimento da proposta',
  })
  @IsOptional()
  @IsDateString()
  receivedAt?: string;

  @ApiPropertyOptional({
    example: 50000,
    description: 'Valor total em centavos',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  totalCents?: number;

  @ApiPropertyOptional({ example: 'Proposta recebida com desconto' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({
    type: [CreatePurchaseQuotationItemDto],
    description: 'Itens atualizados da cotação',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePurchaseQuotationItemDto)
  items?: CreatePurchaseQuotationItemDto[];
}
