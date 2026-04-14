import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StockRequisitionStatus, StockRequisitionType } from '@prisma/client';

export class StockRequisitionItemResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() productId: string;
  @ApiPropertyOptional() productCode?: string;
  @ApiPropertyOptional() productName?: string;
  @ApiPropertyOptional() productEan?: string;
  @ApiProperty() requestedQuantity: number;
  @ApiProperty() unitType: string;
  @ApiPropertyOptional() unitsPerBox?: number;
  @ApiProperty() quantityInBaseUnit: number;
  @ApiPropertyOptional() actualQuantity?: number;
  @ApiProperty() processed: boolean;

  static fromEntity(entity: Record<string, unknown>): StockRequisitionItemResponseDto {
    const dto = new StockRequisitionItemResponseDto();
    dto.id = entity.id as string;
    dto.productId = entity.productId as string;
    dto.productCode = ((entity.product as Record<string, unknown>)?.code as string) ?? undefined;
    dto.productName = ((entity.product as Record<string, unknown>)?.name as string) ?? undefined;
    dto.productEan = ((entity.product as Record<string, unknown>)?.barcode as string) ?? undefined;
    dto.requestedQuantity = entity.requestedQuantity as number;
    dto.unitType = entity.unitType as string;
    dto.unitsPerBox = (entity.unitsPerBox as number) ?? undefined;
    dto.quantityInBaseUnit = entity.quantityInBaseUnit as number;
    dto.actualQuantity = (entity.actualQuantity as number) ?? undefined;
    dto.processed = entity.actualQuantity != null;
    return dto;
  }
}

export class StockRequisitionResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() code: string;
  @ApiProperty({ enum: StockRequisitionType }) type: StockRequisitionType;
  @ApiProperty({ enum: StockRequisitionStatus }) status: StockRequisitionStatus;
  @ApiProperty() requestedByUserId: string;
  @ApiPropertyOptional() requestedByName?: string;
  @ApiPropertyOptional() approvedByUserId?: string;
  @ApiPropertyOptional() approvedByName?: string;
  @ApiPropertyOptional() orderId?: string;
  @ApiPropertyOptional() orderNumber?: string;
  @ApiPropertyOptional() notes?: string;
  @ApiProperty() requestedAt: Date;
  @ApiPropertyOptional() processedAt?: Date;
  @ApiProperty() createdAt: Date;
  @ApiProperty({ type: [StockRequisitionItemResponseDto] }) items: StockRequisitionItemResponseDto[];

  static fromEntity(entity: Record<string, unknown>): StockRequisitionResponseDto {
    const dto = new StockRequisitionResponseDto();
    dto.id = entity.id as string;
    dto.code = entity.code as string;
    dto.type = entity.type as StockRequisitionType;
    dto.status = entity.status as StockRequisitionStatus;
    dto.requestedByUserId = entity.requestedByUserId as string;
    dto.requestedByName = ((entity.requestedBy as Record<string, unknown>)?.name as string) ?? undefined;
    dto.approvedByUserId = (entity.approvedByUserId as string) ?? undefined;
    dto.approvedByName = ((entity.approvedBy as Record<string, unknown>)?.name as string) ?? undefined;
    dto.orderId = (entity.orderId as string) ?? undefined;
    dto.orderNumber = ((entity.order as Record<string, unknown>)?.orderNumber as string) ?? undefined;
    dto.notes = (entity.notes as string) ?? undefined;
    dto.requestedAt = entity.requestedAt as Date;
    dto.processedAt = (entity.processedAt as Date) ?? undefined;
    dto.createdAt = entity.createdAt as Date;
    dto.items = ((entity.items as Record<string, unknown>[]) ?? [])
      .filter((i: Record<string, unknown>) => !i.deletedAt)
      .map(StockRequisitionItemResponseDto.fromEntity);
    return dto;
  }
}
