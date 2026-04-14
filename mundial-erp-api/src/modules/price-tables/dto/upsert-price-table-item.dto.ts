import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

export class UpsertPriceTableItemDto {
  @ApiProperty({ example: 'clxyz123', description: 'ID do produto' })
  @IsString()
  @IsNotEmpty()
  productId: string;

  @ApiProperty({ example: 25000, description: 'Preço em centavos' })
  @IsInt()
  @Min(0)
  priceInCents: number;
}
