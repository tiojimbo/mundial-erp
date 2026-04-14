import { ApiProperty } from '@nestjs/swagger';

export class SalesReportItemDto {
  @ApiProperty() id: string;
  @ApiProperty() orderNumber: string;
  @ApiProperty({ nullable: true }) title: string | null;
  @ApiProperty() status: string;
  @ApiProperty() clientName: string;
  @ApiProperty({ nullable: true }) companyName: string | null;
  @ApiProperty() totalCents: number;
  @ApiProperty() discountCents: number;
  @ApiProperty() freightCents: number;
  @ApiProperty() paidAmountCents: number;
  @ApiProperty() createdAt: Date;
  @ApiProperty({ nullable: true }) issueDate: Date | null;

  static fromEntity(order: Record<string, unknown>): SalesReportItemDto {
    const dto = new SalesReportItemDto();
    dto.id = order.id as string;
    dto.orderNumber = order.orderNumber as string;
    dto.title = (order.title as string) ?? null;
    dto.status = order.status as string;
    dto.clientName = (order.client as Record<string, unknown>)?.name as string ?? '';
    dto.companyName = (order.company as Record<string, unknown>)?.name as string ?? null;
    dto.totalCents = order.totalCents as number;
    dto.discountCents = order.discountCents as number;
    dto.freightCents = order.freightCents as number;
    dto.paidAmountCents = order.paidAmountCents as number;
    dto.createdAt = order.createdAt as Date;
    dto.issueDate = (order.issueDate as Date) ?? null;
    return dto;
  }
}

export class SalesReportResponseDto {
  @ApiProperty({ type: [SalesReportItemDto] })
  items: SalesReportItemDto[];

  @ApiProperty() total: number;
  @ApiProperty() page: number;
  @ApiProperty() limit: number;

  @ApiProperty({ description: 'Soma total de vendas na pagina (cents)' })
  pageTotalCents: number;

  @ApiProperty({ description: 'Soma total de vendas no periodo (cents)' })
  grandTotalCents: number;
}
