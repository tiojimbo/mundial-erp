import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsHexColor,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

/**
 * Payload de criacao de CustomTaskType. Builtin nao e editavel via API;
 * isso gera sempre tipo privado do workspace corrente (workspaceId injetado
 * pelo controller).
 */
export class CreateCustomTaskTypeDto {
  @ApiProperty({ example: 'Ordem', minLength: 1, maxLength: 16 })
  @IsString()
  @MinLength(1)
  @MaxLength(16)
  name!: string;

  @ApiPropertyOptional({ example: 'Ordens', maxLength: 16 })
  @IsOptional()
  @IsString()
  @MaxLength(16)
  namePlural?: string;

  @ApiPropertyOptional({ example: 'Ordens de producao', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  description?: string;

  /** Nome do icone lucide (ex: `CircleDot`, `Flag`). Apenas letras e numeros. */
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
