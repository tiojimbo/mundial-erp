import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateCommentDto {
  @ApiProperty({ description: 'ID da tarefa (WorkItem) destino do comentário.' })
  @IsString()
  @MinLength(1)
  taskId!: string;

  @ApiProperty({
    description: 'Texto puro (canonical). Nunca HTML bruto — sanitize no FE.',
    minLength: 1,
    maxLength: 10_000,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(10_000)
  content!: string;

  @ApiPropertyOptional({
    description:
      'BlockNote JSON AST opcional. Persistido como Json no banco. FE deve gerar `content` a partir dele.',
  })
  @IsOptional()
  @IsObject()
  contentBlocks?: Record<string, unknown>;

  @ApiPropertyOptional({
    description: 'ID do comentário pai (resposta em thread).',
  })
  @IsOptional()
  @IsString()
  parentId?: string;

  @ApiPropertyOptional({
    description:
      'ID do usuário ao qual este comentário atribui a tarefa (Hoppe assign-via-comment).',
  })
  @IsOptional()
  @IsString()
  assigneeId?: string;
}
