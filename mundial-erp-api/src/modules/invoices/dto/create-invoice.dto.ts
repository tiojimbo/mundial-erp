import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Min,
} from 'class-validator';
import { InvoiceDirection } from '@prisma/client';

export class CreateInvoiceDto {
  @ApiPropertyOptional({ example: '000123456' })
  @IsOptional()
  @IsString()
  invoiceNumber?: string;

  @ApiProperty({ enum: InvoiceDirection, example: 'OUTBOUND' })
  @IsEnum(InvoiceDirection, {
    message: 'Direção deve ser INBOUND ou OUTBOUND',
  })
  direction: InvoiceDirection;

  @ApiPropertyOptional({ example: 'clxyz123order' })
  @IsOptional()
  @IsString()
  orderId?: string;

  @ApiPropertyOptional({ example: 'clxyz123client' })
  @IsOptional()
  @IsString()
  clientId?: string;

  @ApiPropertyOptional({ example: 'clxyz123company' })
  @IsOptional()
  @IsString()
  companyId?: string;

  @ApiProperty({ example: 150000, description: 'Valor total em centavos' })
  @IsInt({ message: 'Valor total deve ser um número inteiro (centavos)' })
  @Min(0, { message: 'Valor total não pode ser negativo' })
  totalCents: number;

  @ApiPropertyOptional({ description: 'Conteúdo XML da NF-e' })
  @IsOptional()
  @IsString()
  xmlContent?: string;

  @ApiPropertyOptional({ example: 'https://storage.example.com/nfe.pdf' })
  @IsOptional()
  @IsString()
  pdfUrl?: string;

  @ApiPropertyOptional({
    example: '35240612345678000195550010000001231234567890',
    description: 'Chave de acesso (44 dígitos numéricos)',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{44}$/, {
    message: 'Chave de acesso deve ter exatamente 44 dígitos numéricos',
  })
  accessKey?: string;
}
