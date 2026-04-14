import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsIn,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { IsInt, Min, Max } from 'class-validator';

const VALID_TYPES = [
  'all',
  'clients',
  'products',
  'orders',
  'invoices',
  'suppliers',
] as const;

export type SearchType = (typeof VALID_TYPES)[number];

export class SearchQueryDto {
  @ApiProperty({ description: 'Termo de busca', example: 'telha' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  q: string;

  @ApiPropertyOptional({
    description: 'Tipo de entidade para filtrar',
    enum: VALID_TYPES,
    default: 'all',
  })
  @IsOptional()
  @IsIn(VALID_TYPES)
  type: SearchType = 'all';

  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;

  get from(): number {
    return (this.page - 1) * this.limit;
  }

  get size(): number {
    return this.limit;
  }
}
