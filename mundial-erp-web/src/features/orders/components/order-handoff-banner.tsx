'use client';

import type { Order } from '../types/order.types';
import { ORDER_STATUS_LABELS } from '../types/order.types';

type Props = {
  order: Order;
};

const HANDOFF_MESSAGES: Partial<Record<string, string>> = {
  FATURAR: 'Pedido aguardando conciliacao do Financeiro',
  PRODUZIR: 'Pedido aguardando inicio pela Producao',
  PRODUZIDO: 'Pedido aguardando conferencia e entrega',
};

export function OrderHandoffBanner({ order }: Props) {
  const message = HANDOFF_MESSAGES[order.status];

  const hasPendingHandoff = order.processInstances?.some((pi) =>
    pi.status !== 'COMPLETED' && pi.status !== 'CANCELLED',
  );

  if (!message || !hasPendingHandoff) return null;

  return (
    <div className='flex items-center gap-2 rounded-lg border border-state-information-base bg-state-information-lighter px-4 py-2.5'>
      <i className='ri-share-forward-line text-lg text-state-information-base' />
      <span className='text-paragraph-sm text-state-information-base'>
        {message}
      </span>
      <span className='ml-auto text-label-xs text-state-information-base'>
        Status: {ORDER_STATUS_LABELS[order.status]}
      </span>
    </div>
  );
}
