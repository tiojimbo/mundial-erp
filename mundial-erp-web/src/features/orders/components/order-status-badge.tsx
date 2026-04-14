'use client';

import * as Badge from '@/components/ui/badge';
import type { OrderStatus } from '../types/order.types';
import { ORDER_STATUS_LABELS } from '../types/order.types';

type BadgeColor = React.ComponentProps<typeof Badge.Root>['color'];

const STATUS_BADGE_MAP: Record<OrderStatus, BadgeColor> = {
  EM_ORCAMENTO: 'blue',
  FATURAR: 'orange',
  FATURADO: 'green',
  PRODUZIR: 'purple',
  EM_PRODUCAO: 'purple',
  PRODUZIDO: 'teal',
  ENTREGUE: 'green',
  CANCELADO: 'red',
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const color = STATUS_BADGE_MAP[status] ?? ('gray' as BadgeColor);

  return (
    <Badge.Root color={color} variant='stroke' size='small'>
      <Badge.Dot />
      {ORDER_STATUS_LABELS[status] ?? status}
    </Badge.Root>
  );
}
