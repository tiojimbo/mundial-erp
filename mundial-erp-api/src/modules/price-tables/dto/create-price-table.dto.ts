import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreatePriceTableDto {
  @ApiProperty({
    example: 'Tabela Padrão',
    description: 'Nome da tabela de preço',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({ example: true, description: 'É a tabela padrão?' })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @ApiPropertyOptional({
    example: 1,
    description: 'ID no Pro Finanças (legado)',
  })
  @IsOptional()
  @IsInt()
  proFinancasId?: number;
}
