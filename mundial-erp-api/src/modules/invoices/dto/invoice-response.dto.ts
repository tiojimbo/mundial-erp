import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { InvoiceDirection } from '@prisma/client';

export class InvoiceResponseDto {
  @ApiProperty()
  id: string;

  @ApiPropertyOptional()
  invoiceNumber: string | null;

  @ApiProperty({ enum: ['INBOUND', 'OUTBOUND'] })
  direction: InvoiceDirection;

  @ApiPropertyOptional()
  orderId: string | null;

  @ApiPropertyOptional()
  clientId: string | null;

  @ApiPropertyOptional()
  clientName: string | null;

  @ApiPropertyOptional()
  companyId: string | null;

  @ApiPropertyOptional()
  companyName: string | null;

  @ApiProperty()
  totalCents: number;

  @ApiPropertyOptional()
  issuedAt: Date | null;

  @ApiPropertyOptional()
  cancelledAt: Date | null;

  @ApiPropertyOptional()
  xmlContent: string | null;

  @ApiPropertyOptional()
  pdfUrl: string | null;

  @ApiPropertyOptional({ description: 'Chave de acesso (44 dígitos)' })
  accessKey: string | null;

  @ApiPropertyOptional()
  proFinancasId: number | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  static fromEntity(entity: Record<string, unknown>): InvoiceResponseDto {
    const dto = new InvoiceResponseDto();
    dto.id = entity.id as string;
    dto.invoiceNumber = (entity.invoiceNumber as string) ?? null;
    dto.direction = entity.direction as InvoiceDirection;
    dto.orderId = (entity.orderId as string) ?? null;
    dto.clientId = (entity.clientId as string) ?? null;
    dto.clientName =
      ((entity.client as Record<string, unknown>)?.name as string) ?? null;
    dto.companyId = (entity.companyId as string) ?? null;
    const company = entity.company as
      | Record<string, unknown>
      | null
      | undefined;
    dto.companyName =
      (company?.tradeName as string) ?? (company?.name as string) ?? null;
    dto.totalCents = entity.totalCents as number;
    dto.issuedAt = (entity.issuedAt as Date) ?? null;
    dto.cancelledAt = (entity.cancelledAt as Date) ?? null;
    dto.xmlContent = (entity.xmlContent as string) ?? null;
    dto.pdfUrl = (entity.pdfUrl as string) ?? null;
    dto.accessKey = (entity.accessKey as string) ?? null;
    dto.proFinancasId = (entity.proFinancasId as number) ?? null;
    dto.createdAt = entity.createdAt as Date;
    dto.updatedAt = entity.updatedAt as Date;
    return dto;
  }
}
