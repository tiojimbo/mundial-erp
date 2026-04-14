import { ApiProperty } from '@nestjs/swagger';

export class FinancialSummaryResponseDto {
  @ApiProperty({ description: 'Total a receber (cents)' })
  totalReceivableCents: number;

  @ApiProperty({ description: 'Total recebido (cents)' })
  totalReceivedCents: number;

  @ApiProperty({ description: 'Total a receber vencido (cents)' })
  totalOverdueReceivableCents: number;

  @ApiProperty({ description: 'Quantidade de contas a receber vencidas' })
  overdueReceivableCount: number;

  @ApiProperty({ description: 'Total a pagar (cents)' })
  totalPayableCents: number;

  @ApiProperty({ description: 'Total pago (cents)' })
  totalPaidCents: number;

  @ApiProperty({ description: 'Total a pagar vencido (cents)' })
  totalOverduePayableCents: number;

  @ApiProperty({ description: 'Quantidade de contas a pagar vencidas' })
  overduePayableCount: number;

  @ApiProperty({ description: 'Saldo projetado (recebíveis - pagáveis pendentes, cents)' })
  projectedBalanceCents: number;

  @ApiProperty({ description: 'Quantidade de NF-e emitidas' })
  invoiceCount: number;

  @ApiProperty({ description: 'Total NF-e emitidas (cents)' })
  invoiceTotalCents: number;
}
