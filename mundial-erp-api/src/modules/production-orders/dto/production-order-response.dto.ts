import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// --- Sub-entity Response DTOs ---

export class ProductionOrderItemResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() productionOrderId: string;
  @ApiProperty() orderItemId: string;
  @ApiProperty() productId: string;
  @ApiProperty() quantity: number;
  @ApiPropertyOptional() pieces: number | null;
  @ApiPropertyOptional() size: number | null;
  @ApiPropertyOptional() unitMeasureId: string | null;
  @ApiPropertyOptional() product?: Record<string, unknown>;
  @ApiPropertyOptional() orderItem?: Record<string, unknown>;
  @ApiPropertyOptional() unitMeasure?: Record<string, unknown> | null;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;

  static fromEntity(
    entity: Record<string, unknown>,
  ): ProductionOrderItemResponseDto {
    const dto = new ProductionOrderItemResponseDto();
    dto.id = entity.id as string;
    dto.productionOrderId = entity.productionOrderId as string;
    dto.orderItemId = entity.orderItemId as string;
    dto.productId = entity.productId as string;
    dto.quantity = entity.quantity as number;
    dto.pieces = (entity.pieces as number) ?? null;
    dto.size = (entity.size as number) ?? null;
    dto.unitMeasureId = (entity.unitMeasureId as string) ?? null;
    dto.createdAt = entity.createdAt as Date;
    dto.updatedAt = entity.updatedAt as Date;
    if (entity.product) dto.product = entity.product as Record<string, unknown>;
    if (entity.orderItem)
      dto.orderItem = entity.orderItem as Record<string, unknown>;
    if (entity.unitMeasure)
      dto.unitMeasure = entity.unitMeasure as Record<string, unknown>;
    return dto;
  }
}

export class ProductionConsumptionResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() productionOrderId: string;
  @ApiProperty() ingredientId: string;
  @ApiPropertyOptional() unitMeasureId: string | null;
  @ApiProperty() plannedQuantity: number;
  @ApiPropertyOptional() actualQuantity: number | null;
  @ApiPropertyOptional() weightM3: number | null;
  @ApiPropertyOptional() weight: number | null;
  @ApiPropertyOptional() costCents: number | null;
  @ApiPropertyOptional() totalCostCents: number | null;
  @ApiProperty() operation: string;
  @ApiPropertyOptional() ingredient?: Record<string, unknown>;
  @ApiPropertyOptional() unitMeasure?: Record<string, unknown> | null;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;

  static fromEntity(
    entity: Record<string, unknown>,
  ): ProductionConsumptionResponseDto {
    const dto = new ProductionConsumptionResponseDto();
    dto.id = entity.id as string;
    dto.productionOrderId = entity.productionOrderId as string;
    dto.ingredientId = entity.ingredientId as string;
    dto.unitMeasureId = (entity.unitMeasureId as string) ?? null;
    dto.plannedQuantity = entity.plannedQuantity as number;
    dto.actualQuantity = (entity.actualQuantity as number) ?? null;
    dto.weightM3 = (entity.weightM3 as number) ?? null;
    dto.weight = (entity.weight as number) ?? null;
    dto.costCents = (entity.costCents as number) ?? null;
    dto.totalCostCents = (entity.totalCostCents as number) ?? null;
    dto.operation = entity.operation as string;
    dto.createdAt = entity.createdAt as Date;
    dto.updatedAt = entity.updatedAt as Date;
    if (entity.ingredient)
      dto.ingredient = entity.ingredient as Record<string, unknown>;
    if (entity.unitMeasure)
      dto.unitMeasure = entity.unitMeasure as Record<string, unknown>;
    return dto;
  }
}

export class ProductionOutputResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() productionOrderId: string;
  @ApiProperty() productId: string;
  @ApiPropertyOptional() unitMeasureId: string | null;
  @ApiProperty() quantity: number;
  @ApiProperty() operation: string;
  @ApiPropertyOptional() product?: Record<string, unknown>;
  @ApiPropertyOptional() unitMeasure?: Record<string, unknown> | null;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;

  static fromEntity(
    entity: Record<string, unknown>,
  ): ProductionOutputResponseDto {
    const dto = new ProductionOutputResponseDto();
    dto.id = entity.id as string;
    dto.productionOrderId = entity.productionOrderId as string;
    dto.productId = entity.productId as string;
    dto.unitMeasureId = (entity.unitMeasureId as string) ?? null;
    dto.quantity = entity.quantity as number;
    dto.operation = entity.operation as string;
    dto.createdAt = entity.createdAt as Date;
    dto.updatedAt = entity.updatedAt as Date;
    if (entity.product) dto.product = entity.product as Record<string, unknown>;
    if (entity.unitMeasure)
      dto.unitMeasure = entity.unitMeasure as Record<string, unknown>;
    return dto;
  }
}

export class ProductionLossResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() productionOrderId: string;
  @ApiPropertyOptional() description: string | null;
  @ApiPropertyOptional() quantity: number | null;
  @ApiPropertyOptional() costCents: number | null;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;

  static fromEntity(
    entity: Record<string, unknown>,
  ): ProductionLossResponseDto {
    const dto = new ProductionLossResponseDto();
    dto.id = entity.id as string;
    dto.productionOrderId = entity.productionOrderId as string;
    dto.description = (entity.description as string) ?? null;
    dto.quantity = (entity.quantity as number) ?? null;
    dto.costCents = (entity.costCents as number) ?? null;
    dto.createdAt = entity.createdAt as Date;
    dto.updatedAt = entity.updatedAt as Date;
    return dto;
  }
}

// --- Main Response DTO ---

export class ProductionOrderResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() orderId: string;
  @ApiProperty() code: string;
  @ApiProperty() status: string;
  @ApiPropertyOptional() type: string | null;
  @ApiPropertyOptional() machineId: string | null;
  @ApiPropertyOptional() batch: string | null;
  @ApiPropertyOptional() scheduledDate: Date | null;
  @ApiPropertyOptional() completedDate: Date | null;
  @ApiPropertyOptional() assignedUserId: string | null;
  @ApiPropertyOptional() notes: string | null;
  @ApiPropertyOptional() order?: Record<string, unknown>;
  @ApiPropertyOptional() assignedUser?: Record<string, unknown> | null;
  @ApiPropertyOptional({ type: [ProductionOrderItemResponseDto] })
  items?: ProductionOrderItemResponseDto[];
  @ApiPropertyOptional({ type: [ProductionConsumptionResponseDto] })
  consumptions?: ProductionConsumptionResponseDto[];
  @ApiPropertyOptional({ type: [ProductionOutputResponseDto] })
  outputs?: ProductionOutputResponseDto[];
  @ApiPropertyOptional({ type: [ProductionLossResponseDto] })
  losses?: ProductionLossResponseDto[];
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;

  static fromEntity(
    entity: Record<string, unknown>,
  ): ProductionOrderResponseDto {
    const dto = new ProductionOrderResponseDto();
    dto.id = entity.id as string;
    dto.orderId = entity.orderId as string;
    dto.code = entity.code as string;
    dto.status = entity.status as string;
    dto.type = (entity.type as string) ?? null;
    dto.machineId = (entity.machineId as string) ?? null;
    dto.batch = (entity.batch as string) ?? null;
    dto.scheduledDate = (entity.scheduledDate as Date) ?? null;
    dto.completedDate = (entity.completedDate as Date) ?? null;
    dto.assignedUserId = (entity.assignedUserId as string) ?? null;
    dto.notes = (entity.notes as string) ?? null;
    dto.createdAt = entity.createdAt as Date;
    dto.updatedAt = entity.updatedAt as Date;
    if (entity.order) dto.order = entity.order as Record<string, unknown>;
    if (entity.assignedUser)
      dto.assignedUser = entity.assignedUser as Record<string, unknown>;
    if (entity.items) {
      dto.items = (entity.items as Record<string, unknown>[]).map(
        ProductionOrderItemResponseDto.fromEntity,
      );
    }
    if (entity.consumptions) {
      dto.consumptions = (entity.consumptions as Record<string, unknown>[]).map(
        ProductionConsumptionResponseDto.fromEntity,
      );
    }
    if (entity.outputs) {
      dto.outputs = (entity.outputs as Record<string, unknown>[]).map(
        ProductionOutputResponseDto.fromEntity,
      );
    }
    if (entity.losses) {
      dto.losses = (entity.losses as Record<string, unknown>[]).map(
        ProductionLossResponseDto.fromEntity,
      );
    }
    return dto;
  }
}
