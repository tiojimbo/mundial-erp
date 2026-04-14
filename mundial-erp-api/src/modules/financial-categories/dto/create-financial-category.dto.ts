import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateFinancialCategoryDto {
  @ApiProperty({ example: 'Vendas' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiProperty({ example: 'RECEITA', enum: ['RECEITA', 'DESPESA'] })
  @IsString()
  @IsNotEmpty()
  @IsIn(['RECEITA', 'DESPESA'])
  type: string;

  @ApiPropertyOptional({ example: 'clxyz123...' })
  @IsOptional()
  @IsString()
  parentId?: string;
}
