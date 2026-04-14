import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AccountPayable, PurchaseOrder } from '@prisma/client';

type PurchaseOrderWithAP = PurchaseOrder & {
  accountPayable?: AccountPayable | null;
};

export class PurchaseOrderResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  supplierId: string;

  @ApiPropertyOptional()
  quotationId: string | null;

  @ApiProperty()
  status: string;

  @ApiProperty()
  totalCents: number;

  @ApiPropertyOptional()
  expectedDeliveryDate: Date | null;

  @ApiPropertyOptional()
  notes: string | null;

  @ApiPropertyOptional({ description: 'ID do contas a pagar gerado automaticamente' })
  accountPayableId?: string | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  static fromEntity(entity: PurchaseOrderWithAP): PurchaseOrderResponseDto {
    const dto = new PurchaseOrderResponseDto();
    dto.id = entity.id;
    dto.supplierId = entity.supplierId;
    dto.quotationId = entity.quotationId;
    dto.status = entity.status;
    dto.totalCents = entity.totalCents;
    dto.expectedDeliveryDate = entity.expectedDeliveryDate;
    dto.notes = entity.notes;
    dto.accountPayableId = entity.accountPayable?.id ?? null;
    dto.createdAt = entity.createdAt;
    dto.updatedAt = entity.updatedAt;
    return dto;
  }
}
