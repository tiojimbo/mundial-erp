import { ApiProperty } from '@nestjs/swagger';

export class CashflowPeriodDto {
  @ApiProperty({ description: 'Label do periodo' })
  period: string;

  @ApiProperty({ description: 'Entradas no periodo (cents)' })
  inflowCents: number;

  @ApiProperty({ description: 'Saidas no periodo (cents)' })
  outflowCents: number;

  @ApiProperty({ description: 'Saldo do periodo (cents)' })
  netCents: number;

  @ApiProperty({ description: 'Saldo acumulado (cents)' })
  runningBalanceCents: number;
}

export class CashflowResponseDto {
  @ApiProperty({ type: [CashflowPeriodDto] })
  periods: CashflowPeriodDto[];

  @ApiProperty({ description: 'Total de entradas (cents)' })
  totalInflowCents: number;

  @ApiProperty({ description: 'Total de saidas (cents)' })
  totalOutflowCents: number;

  @ApiProperty({ description: 'Saldo final (cents)' })
  netBalanceCents: number;
}
