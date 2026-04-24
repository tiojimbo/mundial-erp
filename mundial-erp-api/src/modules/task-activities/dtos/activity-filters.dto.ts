import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export type ActivityTypeFilter = 'ACTIVITY' | 'COMMENT' | 'ALL';

export class ActivityFiltersDto {
  @ApiPropertyOptional({ default: 0, description: 'Offset legado (preferir cursor)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'skip deve ser inteiro' })
  @Min(0, { message: 'skip minimo 0' })
  skip?: number = 0;

  @ApiPropertyOptional({ default: 50, maximum: 100, description: 'Itens por pagina (max 100)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'limit deve ser inteiro' })
  @Min(1, { message: 'limit minimo 1' })
  @Max(100, { message: 'limit maximo 100' })
  limit?: number = 50;

  @ApiPropertyOptional({
    enum: ['ACTIVITY', 'COMMENT', 'ALL'],
    default: 'ALL',
    description: 'Filtra projecao: so atividades (todas exceto COMMENT_ADDED), so comentarios ou ambos',
  })
  @IsOptional()
  @IsIn(['ACTIVITY', 'COMMENT', 'ALL'], {
    message: 'type deve ser ACTIVITY, COMMENT ou ALL',
  })
  type?: ActivityTypeFilter;

  @ApiPropertyOptional({
    description: 'CSV de TaskActivityType (ex: STATUS_CHANGED,COMMENT_ADDED). Cada item validado contra enum Prisma',
  })
  @IsOptional()
  @IsString({ message: 'action deve ser string CSV' })
  @MaxLength(500, { message: 'action excede 500 chars' })
  action?: string;

  @ApiPropertyOptional({ description: 'Filtra pelo actorId (CUID)' })
  @IsOptional()
  @IsString()
  @Matches(/^c[a-z0-9]{20,30}$/, {
    message: 'actorId deve ser um CUID valido',
  })
  actorId?: string;

  @ApiPropertyOptional({ description: 'Cursor ISO datetime; retorna items com createdAt < cursor' })
  @IsOptional()
  @IsISO8601({}, { message: 'cursor deve ser ISO 8601 datetime' })
  cursor?: string;
}
