import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ViewType } from '@prisma/client';
import {
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class CreateProcessViewDto {
  @ApiProperty({ example: 'cuid-do-processo' })
  @IsString()
  processId: string;

  @ApiProperty({ example: 'Visão Kanban' })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiProperty({ enum: ViewType, example: ViewType.BOARD })
  @IsEnum(ViewType)
  viewType: ViewType;

  @ApiPropertyOptional({ example: {} })
  @IsOptional()
  @IsObject()
  config?: Record<string, any>;
}
