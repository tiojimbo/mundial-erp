import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreatePurchaseQuotationItemDto } from './create-purchase-quotation-item.dto';

export class CreatePurchaseQuotationDto {
  @ApiProperty({ example: 'clxyz123...', description: 'ID do fornecedor' })
  @IsString()
  @IsNotEmpty()
  supplierId: string;

  @ApiPropertyOptional({ example: 'Cotação para matéria-prima Q2' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ type: [CreatePurchaseQuotationItemDto], description: 'Itens da cotação' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePurchaseQuotationItemDto)
  items?: CreatePurchaseQuotationItemDto[];
}
