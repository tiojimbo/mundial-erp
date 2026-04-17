import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';

export class CreateAreaDto {
  @ApiProperty({ example: 'Atendimento ao Cliente' })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiProperty({ description: 'ID do departamento' })
  @IsString()
  @MinLength(1)
  departmentId: string;

  @ApiPropertyOptional({ example: 'Área responsável pelo atendimento' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isPrivate?: boolean;

  @ApiPropertyOptional({ example: '📋', description: 'Emoji ou remixicon' })
  @IsOptional()
  @IsString()
  icon?: string;

  @ApiPropertyOptional({ example: '#3B82F6', description: 'Cor hex do badge' })
  @IsOptional()
  @IsString()
  @Matches(/^#([A-Fa-f0-9]{3}|[A-Fa-f0-9]{6})$/, {
    message: 'color deve ser um hex válido (#FFF ou #3B82F6)',
  })
  color?: string;

  @ApiPropertyOptional({
    default: true,
    description: 'Se true, herda statuses do departamento',
  })
  @IsOptional()
  @IsBoolean()
  useSpaceStatuses?: boolean;

  @ApiPropertyOptional({ example: 0, description: 'Ordem de exibição' })
  @IsOptional()
  @IsInt()
  sortOrder?: number;
}
