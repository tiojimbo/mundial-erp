import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateLossDto {
  @ApiPropertyOptional({ example: 'Perda por quebra', description: 'Descrição da perda' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 5, description: 'Quantidade perdida' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  quantity?: number;

  @ApiPropertyOptional({ example: 2500, description: 'Custo da perda em centavos' })
  @IsOptional()
  @IsNumber()
  costCents?: number;
}
