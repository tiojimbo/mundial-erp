import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { ChatMessageType, ContentFormat } from '@prisma/client';

export class CreateMessageDto {
  @ApiProperty({ maxLength: 40000 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(40000)
  content: string;

  @ApiPropertyOptional({ enum: ChatMessageType, default: 'MESSAGE' })
  @IsOptional()
  @IsEnum(ChatMessageType)
  type?: ChatMessageType;

  @ApiPropertyOptional({ enum: ContentFormat, default: 'TEXT_MD' })
  @IsOptional()
  @IsEnum(ContentFormat)
  contentFormat?: ContentFormat;

  @ApiPropertyOptional({ description: 'TipTap JSON para rich text' })
  @IsOptional()
  @IsObject()
  richContent?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'ID da mensagem pai (para replies)' })
  @IsOptional()
  @IsString()
  @Matches(/^c[a-z0-9]{20,30}$/, { message: 'parentMessageId deve ser um CUID valido' })
  parentMessageId?: string;

  @ApiPropertyOptional({ description: 'ID do usuario responsavel' })
  @IsOptional()
  @IsString()
  @Matches(/^c[a-z0-9]{20,30}$/, { message: 'assigneeId deve ser um CUID valido' })
  assigneeId?: string;

  @ApiPropertyOptional({
    description: 'Dados extras para tipo POST',
  })
  @IsOptional()
  @IsObject()
  postData?: Record<string, unknown>;

  @ApiPropertyOptional({
    description: 'Reacoes iniciais (max 10)',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  reactions?: string[];

  @ApiPropertyOptional({
    description: 'IDs de followers da thread (max 10)',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  followers?: string[];
}
