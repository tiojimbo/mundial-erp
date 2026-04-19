import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StatusCategory } from '@prisma/client';
import {
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';

export class CreateWorkflowStatusDto {
  @ApiProperty({ example: 'Em Andamento' })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiProperty({ enum: StatusCategory, example: 'ACTIVE' })
  @IsEnum(StatusCategory)
  category: StatusCategory;

  @ApiProperty({ example: '#3B82F6', description: 'Hex color code' })
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, {
    message: 'color must be a valid hex color (e.g. #3B82F6)',
  })
  color: string;

  @ApiPropertyOptional({ example: 'circle-dot' })
  @IsOptional()
  @IsString()
  icon?: string;

  @ApiProperty({ description: 'ID do departamento' })
  @IsString()
  @MinLength(1)
  departmentId: string;
}
