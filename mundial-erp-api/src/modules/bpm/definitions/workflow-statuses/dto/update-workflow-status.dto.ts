import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Matches, MinLength } from 'class-validator';

export class UpdateWorkflowStatusDto {
  @ApiPropertyOptional({ example: 'Em Progresso' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @ApiPropertyOptional({ example: '#10B981', description: 'Hex color code' })
  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, { message: 'color must be a valid hex color (e.g. #10B981)' })
  color?: string;

  @ApiPropertyOptional({ example: 'check-circle' })
  @IsOptional()
  @IsString()
  icon?: string;
}
