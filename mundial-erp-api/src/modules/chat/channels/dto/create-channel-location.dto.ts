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
import { ChannelVisibility } from '@prisma/client';

export class CreateChannelLocationDto {
  @ApiPropertyOptional({ maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({ maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  topic?: string;

  @ApiPropertyOptional({ enum: ChannelVisibility, default: 'PUBLIC' })
  @IsOptional()
  @IsEnum(ChannelVisibility)
  visibility?: ChannelVisibility;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @IsString({ each: true })
  userIds?: string[];

  @ApiProperty({
    example: 'Department',
    description: 'Tipo da entidade pai',
  })
  @IsString()
  @IsNotEmpty()
  locationEntity: string;

  @ApiProperty({ example: 'cuid-do-department' })
  @IsString()
  @IsNotEmpty()
  locationId: string;
}
