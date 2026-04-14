import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ContentFormat } from '@prisma/client';

export class UpdateMessageDto {
  @ApiPropertyOptional({ maxLength: 40000 })
  @IsOptional()
  @IsString()
  @MaxLength(40000)
  content?: string;

  @ApiPropertyOptional({ enum: ContentFormat })
  @IsOptional()
  @IsEnum(ContentFormat)
  contentFormat?: ContentFormat;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  richContent?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  assigneeId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  postData?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  resolved?: boolean;
}
