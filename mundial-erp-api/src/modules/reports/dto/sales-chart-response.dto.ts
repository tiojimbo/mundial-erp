import { ApiProperty } from '@nestjs/swagger';

export class SalesChartPointDto {
  @ApiProperty({
    description: 'Label do periodo (ex: 2026-04, 2026-W15, 2026-04-07)',
  })
  period: string;

  @ApiProperty({ description: 'Total de vendas no periodo (cents)' })
  totalCents: number;

  @ApiProperty({ description: 'Quantidade de pedidos no periodo' })
  orderCount: number;
}

export class SalesChartResponseDto {
  @ApiProperty({ type: [SalesChartPointDto] })
  data: SalesChartPointDto[];

  @ApiProperty({ description: 'Total geral de vendas (cents)' })
  totalCents: number;

  @ApiProperty({ description: 'Total geral de pedidos' })
  totalOrders: number;
}
