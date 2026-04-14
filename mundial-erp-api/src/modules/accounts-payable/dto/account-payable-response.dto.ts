import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  AccountPayable,
  FinancialCategory,
  PurchaseOrder,
  Supplier,
} from '@prisma/client';

type AccountPayableWithRelations = AccountPayable & {
  supplier?: Supplier | null;
  purchaseOrder?: PurchaseOrder | null;
  category?: FinancialCategory | null;
};

export class AccountPayableResponseDto {
  @ApiProperty()
  id: string;

  @ApiPropertyOptional()
  supplierId: string | null;

  @ApiPropertyOptional()
  purchaseOrderId: string | null;

  @ApiPropertyOptional()
  description: string | null;

  @ApiProperty()
  amountCents: number;

  @ApiProperty()
  paidAmountCents: number;

  @ApiProperty()
  dueDate: Date;

  @ApiPropertyOptional()
  paidDate: Date | null;

  @ApiProperty()
  status: string;

  @ApiPropertyOptional()
  categoryId: string | null;

  @ApiPropertyOptional({ description: 'Nome do fornecedor' })
  supplierName?: string | null;

  @ApiPropertyOptional({ description: 'Nome da categoria financeira' })
  categoryName?: string | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  static fromEntity(entity: Record<string, unknown>): AccountPayableResponseDto {
    const dto = new AccountPayableResponseDto();
    dto.id = entity.id as string;
    dto.supplierId = (entity.supplierId as string) ?? null;
    dto.purchaseOrderId = (entity.purchaseOrderId as string) ?? null;
    dto.description = (entity.description as string) ?? null;
    dto.amountCents = entity.amountCents as number;
    dto.paidAmountCents = entity.paidAmountCents as number;
    dto.dueDate = entity.dueDate as Date;
    dto.paidDate = (entity.paidDate as Date) ?? null;
    dto.status = entity.status as string;
    dto.categoryId = (entity.categoryId as string) ?? null;
    dto.supplierName = (entity.supplier as Record<string, unknown>)?.name as string ?? null;
    dto.categoryName = (entity.category as Record<string, unknown>)?.name as string ?? null;
    dto.createdAt = entity.createdAt as Date;
    dto.updatedAt = entity.updatedAt as Date;
    return dto;
  }
}
