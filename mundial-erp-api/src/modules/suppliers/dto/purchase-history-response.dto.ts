import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PurchaseOrder } from '@prisma/client';

export class PurchaseHistoryResponseDto {
  @ApiProperty()
  id: string;

  @ApiPropertyOptional({
    description: 'ID da cotação que originou este pedido',
  })
  quotationId: string | null;

  @ApiProperty()
  status: string;

  @ApiProperty()
  totalCents: number;

  @ApiPropertyOptional()
  expectedDeliveryDate: Date | null;

  @ApiPropertyOptional()
  notes: string | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  static fromEntity(entity: PurchaseOrder): PurchaseHistoryResponseDto {
    const dto = new PurchaseHistoryResponseDto();
    dto.id = entity.id;
    dto.quotationId = entity.quotationId;
    dto.status = entity.status;
    dto.totalCents = entity.totalCents;
    dto.expectedDeliveryDate = entity.expectedDeliveryDate;
    dto.notes = entity.notes;
    dto.createdAt = entity.createdAt;
    dto.updatedAt = entity.updatedAt;
    return dto;
  }
}
