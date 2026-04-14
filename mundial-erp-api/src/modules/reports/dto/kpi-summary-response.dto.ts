import { ApiProperty } from '@nestjs/swagger';

export class KpiSummaryResponseDto {
  @ApiProperty({ description: 'Receita total no periodo (cents)' })
  totalRevenueCents: number;

  @ApiProperty({ description: 'Total de despesas no periodo (cents)' })
  totalExpensesCents: number;

  @ApiProperty({ description: 'Margem bruta (receita - despesas, cents)' })
  grossMarginCents: number;

  @ApiProperty({ description: 'Margem bruta percentual' })
  grossMarginPercent: number;

  @ApiProperty({ description: 'Quantidade de pedidos faturados' })
  orderCount: number;

  @ApiProperty({ description: 'Ticket medio (cents)' })
  averageTicketCents: number;

  @ApiProperty({ description: 'Total a receber vencido (cents)' })
  overdueReceivableCents: number;

  @ApiProperty({ description: 'Total a pagar vencido (cents)' })
  overduePayableCents: number;
}
