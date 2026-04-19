import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// --- Item Response DTO ---

export class SeparationOrderItemResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() separationOrderId: string;
  @ApiProperty() orderItemId: string;
  @ApiProperty() productId: string;
  @ApiProperty() quantity: number;
  @ApiPropertyOptional() pieces: number | null;
  @ApiPropertyOptional() stockLocation: string | null;
  @ApiProperty() isSeparated: boolean;
  @ApiProperty() isChecked: boolean;
  @ApiPropertyOptional() product?: Record<string, unknown>;
  @ApiPropertyOptional() orderItem?: Record<string, unknown>;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;

  static fromEntity(
    entity: Record<string, unknown>,
  ): SeparationOrderItemResponseDto {
    const dto = new SeparationOrderItemResponseDto();
    dto.id = entity.id as string;
    dto.separationOrderId = entity.separationOrderId as string;
    dto.orderItemId = entity.orderItemId as string;
    dto.productId = entity.productId as string;
    dto.quantity = entity.quantity as number;
    dto.pieces = (entity.pieces as number) ?? null;
    dto.stockLocation = (entity.stockLocation as string) ?? null;
    dto.isSeparated = entity.isSeparated as boolean;
    dto.isChecked = entity.isChecked as boolean;
    dto.createdAt = entity.createdAt as Date;
    dto.updatedAt = entity.updatedAt as Date;
    if (entity.product) dto.product = entity.product as Record<string, unknown>;
    if (entity.orderItem)
      dto.orderItem = entity.orderItem as Record<string, unknown>;
    return dto;
  }
}

// --- Main Response DTO ---

export class SeparationOrderResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() orderId: string;
  @ApiProperty() code: string;
  @ApiProperty() status: string;
  @ApiPropertyOptional() assignedUserId: string | null;
  @ApiPropertyOptional() scheduledDate: Date | null;
  @ApiPropertyOptional() completedDate: Date | null;
  @ApiPropertyOptional() order?: Record<string, unknown>;
  @ApiPropertyOptional({ type: [SeparationOrderItemResponseDto] })
  items?: SeparationOrderItemResponseDto[];
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;

  static fromEntity(
    entity: Record<string, unknown>,
  ): SeparationOrderResponseDto {
    const dto = new SeparationOrderResponseDto();
    dto.id = entity.id as string;
    dto.orderId = entity.orderId as string;
    dto.code = entity.code as string;
    dto.status = entity.status as string;
    dto.assignedUserId = (entity.assignedUserId as string) ?? null;
    dto.scheduledDate = (entity.scheduledDate as Date) ?? null;
    dto.completedDate = (entity.completedDate as Date) ?? null;
    dto.createdAt = entity.createdAt as Date;
    dto.updatedAt = entity.updatedAt as Date;
    if (entity.order) dto.order = entity.order as Record<string, unknown>;
    if (entity.items) {
      dto.items = (entity.items as Record<string, unknown>[]).map(
        SeparationOrderItemResponseDto.fromEntity,
      );
    }
    return dto;
  }
}
