import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';

export class CreateTaskDto {
  @ApiProperty({ description: 'ID da atividade' })
  @IsString()
  @MinLength(1)
  activityId: string;

  @ApiProperty({ example: 'Verificar dados do cliente no sistema' })
  @IsString()
  @MinLength(3)
  description: string;

  @ApiPropertyOptional({ example: 0, default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isMandatory?: boolean;
}
