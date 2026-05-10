import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsObject, IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateProcessViewDto {
  @ApiPropertyOptional({ example: 'Visão Kanban Atualizada' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @ApiPropertyOptional({ example: {} })
  @IsOptional()
  @IsObject()
  config?: Record<string, any>;
}
