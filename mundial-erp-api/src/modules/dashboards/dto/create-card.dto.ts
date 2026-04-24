import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CardType } from '@prisma/client';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

/**
 * Nota sobre `schemaVersion` (squad-dashboards principio #5):
 *
 * O model Prisma `DashboardCard` carrega a coluna nativa `schemaVersion`
 * (default 1) desde a migration `20260424_000008_dashboard_card_schema_version`.
 * Este DTO NAO exige `schemaVersion` como campo top-level: o default do DB
 * cobre clients que nao enviam, e clients legados que passam `schemaVersion`
 * dentro de `config` JSON continuam compativeis (backward compat). Bumps
 * futuros serao introduzidos via RFC com sub-DTO por CardType (plano em
 * RFC-002 §5.4 / RFC-003 futura).
 */
export class CreateCardDto {
  @ApiProperty({ enum: CardType, example: 'KPI_NUMBER' })
  @IsEnum(CardType)
  type: CardType;

  @ApiProperty({ example: 'Total de Vendas' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @ApiProperty({
    example: {
      entity: 'orders',
      statusFilter: 'ENTREGUE',
      dateRange: 'last_30d',
    },
    description:
      'Data source config: { entity, processId?, departmentId?, statusFilter?, dateRange? }',
  })
  @IsObject()
  dataSource: Record<string, any>;

  @ApiPropertyOptional({ example: { status: 'ENTREGUE' } })
  @IsOptional()
  @IsObject()
  filters?: Record<string, any>;

  @ApiPropertyOptional({
    example: { xField: 'createdAt', yField: 'totalCents', groupBy: 'status' },
  })
  @IsOptional()
  @IsObject()
  axisConfig?: Record<string, any>;

  @ApiProperty({ example: 0 })
  @IsInt()
  @Min(0)
  layoutX: number;

  @ApiProperty({ example: 0 })
  @IsInt()
  @Min(0)
  layoutY: number;

  @ApiProperty({ example: 4 })
  @IsInt()
  @Min(1)
  layoutW: number;

  @ApiProperty({ example: 3 })
  @IsInt()
  @Min(1)
  layoutH: number;

  @ApiPropertyOptional({
    description: 'Card-type specific settings (colors, labels, etc)',
  })
  @IsOptional()
  @IsObject()
  config?: Record<string, any>;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
