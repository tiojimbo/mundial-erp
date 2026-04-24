import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateCommentDto {
  @ApiPropertyOptional({ minLength: 1, maxLength: 10_000 })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(10_000)
  body?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  bodyBlocks?: Record<string, unknown>;
}
