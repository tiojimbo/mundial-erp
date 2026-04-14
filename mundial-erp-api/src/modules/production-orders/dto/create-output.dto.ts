import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateOutputDto {
  @ApiProperty({ example: 'clxyz456', description: 'ID do produto produzido' })
  @IsString()
  @IsNotEmpty()
  productId: string;

  @ApiPropertyOptional({ example: 'clxyzunit', description: 'ID da unidade de medida' })
  @IsOptional()
  @IsString()
  unitMeasureId?: string;

  @ApiProperty({ example: 100, description: 'Quantidade produzida' })
  @IsNumber()
  @Min(0)
  quantity: number;
}
