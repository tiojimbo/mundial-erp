import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AccountReceivableResponseDto {
  @ApiProperty()
  id: string;

  @ApiPropertyOptional()
  orderId: string | null;

  @ApiProperty()
  clientId: string;

  @ApiPropertyOptional()
  clientName: string | null;

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

  @ApiProperty({ enum: ['PENDING', 'PARTIAL', 'PAID', 'OVERDUE', 'CANCELLED'] })
  status: string;

  @ApiPropertyOptional()
  invoiceId: string | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  static fromEntity(
    entity: Record<string, unknown>,
  ): AccountReceivableResponseDto {
    const dto = new AccountReceivableResponseDto();
    dto.id = entity.id as string;
    dto.orderId = (entity.orderId as string) ?? null;
    dto.clientId = entity.clientId as string;
    dto.clientName =
      ((entity.client as Record<string, unknown>)?.name as string) ?? null;
    dto.description = (entity.description as string) ?? null;
    dto.amountCents = entity.amountCents as number;
    dto.paidAmountCents = entity.paidAmountCents as number;
    dto.dueDate = entity.dueDate as Date;
    dto.paidDate = (entity.paidDate as Date) ?? null;
    dto.status = entity.status as string;
    dto.invoiceId = (entity.invoiceId as string) ?? null;
    dto.createdAt = entity.createdAt as Date;
    dto.updatedAt = entity.updatedAt as Date;
    return dto;
  }
}
