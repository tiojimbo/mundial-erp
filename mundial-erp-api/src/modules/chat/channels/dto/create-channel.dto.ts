import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ChannelType } from '@prisma/client';

export class CreateChannelDto {
  @ApiProperty({ example: 'vendas-geral', maxLength: 255 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({
    example: 'Canal geral do time de vendas',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({
    example: 'Discussoes sobre vendas Q2',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  topic?: string;

  @ApiPropertyOptional({ enum: ['PUBLIC', 'PRIVATE'], default: 'PUBLIC' })
  @IsOptional()
  @IsEnum(ChannelType)
  type?: ChannelType;

  @ApiPropertyOptional({
    description: 'IDs de usuarios a adicionar (max 100)',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @IsString({ each: true })
  userIds?: string[];
}
