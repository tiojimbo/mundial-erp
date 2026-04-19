import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsOptional,
  IsString,
  Length,
  Matches,
  MinLength,
} from 'class-validator';

export class CreateStateDto {
  @ApiProperty({ example: 'São Paulo' })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiProperty({
    example: 'SP',
    description: 'Sigla do estado (2 caracteres maiúsculos)',
  })
  @IsString()
  @Length(2, 2)
  @Matches(/^[A-Z]{2}$/, {
    message: 'UF deve conter exatamente 2 letras maiúsculas',
  })
  uf: string;

  @ApiPropertyOptional({ example: 123 })
  @IsOptional()
  @IsInt()
  proFinancasId?: number;
}
