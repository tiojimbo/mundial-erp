import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateCommentDto {
  @ApiProperty({
    description: 'Texto puro (canonical). Nunca HTML bruto — sanitize no FE.',
    minLength: 1,
    maxLength: 10_000,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(10_000)
  body!: string;

  @ApiPropertyOptional({
    description:
      'BlockNote JSON AST opcional. Persistido como Json no banco. FE deve gerar `body` a partir dele.',
  })
  @IsOptional()
  @IsObject()
  bodyBlocks?: Record<string, unknown>;
}
