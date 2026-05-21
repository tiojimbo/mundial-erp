import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class CreateStatusTemplateItemDto {
  @ApiProperty({ example: 'Para produzir' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'NOT_STARTED' })
  @IsString()
  @IsNotEmpty()
  type: string;

  @ApiProperty({ example: '#8A817C' })
  @IsString()
  @IsNotEmpty()
  color: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;
}

export class CreateStatusTemplateDto {
  @ApiProperty({ example: 'Pedido padrão' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ type: [CreateStatusTemplateItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateStatusTemplateItemDto)
  statuses: CreateStatusTemplateItemDto[];
}
