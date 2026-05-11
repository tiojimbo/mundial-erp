import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsHexColor,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateCustomTaskTypeDto {
  @ApiProperty({ example: 'Ordem', minLength: 1, maxLength: 16 })
  @IsString()
  @MinLength(1)
  @MaxLength(16)
  value!: string;

  @ApiPropertyOptional({ example: 'Ordens', maxLength: 16 })
  @IsOptional()
  @IsString()
  @MaxLength(16)
  pluralName?: string;

  @ApiPropertyOptional({ example: 'Ordens de producao', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  description?: string;

  @ApiPropertyOptional({ example: 'CircleDot', maxLength: 40 })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  @Matches(/^[A-Za-z0-9]+$/, {
    message: 'icon deve conter apenas letras e numeros',
  })
  icon?: string;

  @ApiPropertyOptional({ example: '#6b7280' })
  @IsOptional()
  @IsHexColor()
  color?: string;
}
