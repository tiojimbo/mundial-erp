import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CardType } from '@prisma/client';

export class DashboardFilterResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() field: string;
  @ApiProperty() operator: string;
  @ApiProperty() value: unknown;
  @ApiPropertyOptional() label: string | null;

  static fromEntity(
    entity: Record<string, unknown>,
  ): DashboardFilterResponseDto {
    const dto = new DashboardFilterResponseDto();
    dto.id = entity.id as string;
    dto.field = entity.field as string;
    dto.operator = entity.operator as string;
    dto.value = entity.value;
    dto.label = (entity.label as string) ?? null;
    return dto;
  }
}

export class DashboardCardResponseDto {
  @ApiProperty() id: string;
  @ApiProperty({ enum: CardType }) type: CardType;
  @ApiProperty() title: string;
  @ApiProperty() dataSource: Record<string, unknown>;
  @ApiPropertyOptional() filters: Record<string, unknown> | null;
  @ApiPropertyOptional() axisConfig: Record<string, unknown> | null;
  @ApiProperty() layoutX: number;
  @ApiProperty() layoutY: number;
  @ApiProperty() layoutW: number;
  @ApiProperty() layoutH: number;
  @ApiPropertyOptional() config: Record<string, unknown> | null;
  @ApiProperty() sortOrder: number;

  static fromEntity(entity: Record<string, unknown>): DashboardCardResponseDto {
    const dto = new DashboardCardResponseDto();
    dto.id = entity.id as string;
    dto.type = entity.type as CardType;
    dto.title = entity.title as string;
    dto.dataSource = entity.dataSource as Record<string, unknown>;
    dto.filters = (entity.filters as Record<string, unknown>) ?? null;
    dto.axisConfig = (entity.axisConfig as Record<string, unknown>) ?? null;
    dto.layoutX = entity.layoutX as number;
    dto.layoutY = entity.layoutY as number;
    dto.layoutW = entity.layoutW as number;
    dto.layoutH = entity.layoutH as number;
    dto.config = (entity.config as Record<string, unknown>) ?? null;
    dto.sortOrder = entity.sortOrder as number;
    return dto;
  }
}

export class DashboardResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
  @ApiPropertyOptional() description: string | null;
  @ApiProperty() ownerId: string;
  @ApiPropertyOptional() ownerName: string | null;
  @ApiProperty() isPublic: boolean;
  @ApiPropertyOptional() autoRefreshSeconds: number | null;
  @ApiProperty() sortOrder: number;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
  @ApiProperty({ type: [DashboardCardResponseDto] })
  cards: DashboardCardResponseDto[];
  @ApiProperty({ type: [DashboardFilterResponseDto] })
  filters: DashboardFilterResponseDto[];

  static fromEntity(entity: Record<string, unknown>): DashboardResponseDto {
    const dto = new DashboardResponseDto();
    dto.id = entity.id as string;
    dto.name = entity.name as string;
    dto.description = (entity.description as string) ?? null;
    dto.ownerId = entity.ownerId as string;
    dto.ownerName =
      ((entity.owner as Record<string, unknown>)?.name as string) ?? null;
    dto.isPublic = entity.isPublic as boolean;
    dto.autoRefreshSeconds = (entity.autoRefreshSeconds as number) ?? null;
    dto.sortOrder = entity.sortOrder as number;
    dto.createdAt = entity.createdAt as Date;
    dto.updatedAt = entity.updatedAt as Date;
    dto.cards = ((entity.cards as Record<string, unknown>[]) ?? []).map(
      DashboardCardResponseDto.fromEntity,
    );
    dto.filters = ((entity.filters as Record<string, unknown>[]) ?? []).map(
      DashboardFilterResponseDto.fromEntity,
    );
    return dto;
  }
}
