import { ApiProperty } from '@nestjs/swagger';

export class ClientFinancialResponseDto {
  @ApiProperty({ description: 'Total de AR em centavos' })
  totalAmountCents: number;

  @ApiProperty({ description: 'Total pago em centavos' })
  totalPaidCents: number;

  @ApiProperty({ description: 'Total pendente em centavos (PENDING + PARTIAL)' })
  totalPendingCents: number;

  @ApiProperty({ description: 'Total vencido em centavos (OVERDUE)' })
  totalOverdueCents: number;

  @ApiProperty({ description: 'Quantidade total de títulos' })
  countTotal: number;

  @ApiProperty({ description: 'Títulos pendentes' })
  countPending: number;

  @ApiProperty({ description: 'Títulos vencidos' })
  countOverdue: number;

  @ApiProperty({ description: 'Títulos pagos' })
  countPaid: number;
}
