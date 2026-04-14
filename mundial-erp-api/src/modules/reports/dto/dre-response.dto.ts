import { ApiProperty } from '@nestjs/swagger';

export class DreCategoryLineDto {
  @ApiProperty({ description: 'Nome da categoria' })
  name: string;

  @ApiProperty({ description: 'Valor (cents)' })
  amountCents: number;
}

export class DreResponseDto {
  @ApiProperty({ description: '(+) Receita Bruta de Vendas (cents)' })
  grossRevenueCents: number;

  @ApiProperty({ description: '(-) Descontos concedidos (cents)' })
  discountsCents: number;

  @ApiProperty({ description: '(-) Cancelamentos (cents)' })
  cancellationsCents: number;

  @ApiProperty({ description: '(=) Receita Liquida (cents)' })
  netRevenueCents: number;

  @ApiProperty({ description: '(-) CMV — Custo das Mercadorias Vendidas (cents)' })
  cogsCents: number;

  @ApiProperty({ description: '(=) Lucro Bruto (cents)' })
  grossProfitCents: number;

  @ApiProperty({ description: '(-) Despesas Operacionais totais (cents)' })
  operatingExpensesCents: number;

  @ApiProperty({
    description: 'Detalhamento das despesas operacionais por categoria',
    type: [DreCategoryLineDto],
  })
  operatingExpensesBreakdown: DreCategoryLineDto[];

  @ApiProperty({ description: '(=) Resultado Operacional (cents)' })
  operatingIncomeCents: number;

  @ApiProperty({ description: '(=) Resultado Liquido do Periodo (cents)' })
  netIncomeCents: number;
}
