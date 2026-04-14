import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CardType } from '@prisma/client';
import { IsEnum, IsInt, IsNotEmpty, IsObject, IsOptional, IsString, MaxLength, Min } from 'class-validator';

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
    example: { entity: 'orders', statusFilter: 'ENTREGUE', dateRange: 'last_30d' },
    description: 'Data source config: { entity, processId?, departmentId?, statusFilter?, dateRange? }',
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

  @ApiPropertyOptional({ description: 'Card-type specific settings (colors, labels, etc)' })
  @IsOptional()
  @IsObject()
  config?: Record<string, any>;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
