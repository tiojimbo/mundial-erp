import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';

export class CreatePurchaseQuotationItemDto {
  @ApiProperty({ example: 'clxyz123...', description: 'ID do produto' })
  @IsString()
  @IsNotEmpty()
  productId: string;

  @ApiProperty({ example: 10, description: 'Quantidade' })
  @IsNumber()
  @Min(0.01)
  quantity: number;

  @ApiProperty({ example: 1500, description: 'Preço unitário em centavos' })
  @IsInt()
  @Min(0)
  unitPriceCents: number;
}
