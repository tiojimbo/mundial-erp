'use client';

import { useState } from 'react';
import * as Dropdown from '@/components/ui/dropdown';
import * as Button from '@/components/ui/button';
import { api } from '@/lib/api';
import { isStatusAfter } from '../lib/order-status-machine';
import type { Order, OrderStatus } from '../types/order.types';

type PdfAction = {
  label: string;
  icon: string;
  getUrl: (order: Order) => string | null;
  visibleAfter?: OrderStatus[];
  hideCondition?: (order: Order) => boolean;
};

const PDF_ACTIONS: PdfAction[] = [
  {
    label: 'Imprimir Proposta de Venda',
    icon: 'ri-file-text-line',
    getUrl: (order) => `/orders/${order.id}/pdf`,
  },
  {
    label: 'Imprimir Etiqueta Producao',
    icon: 'ri-price-tag-3-line',
    getUrl: (order) => `/orders/${order.id}/pdf?type=etiqueta-producao`,
  },
  {
    label: 'Imprimir Etiqueta Separacao',
    icon: 'ri-price-tag-3-line',
    getUrl: (order) => `/orders/${order.id}/pdf?type=etiqueta-separacao`,
    hideCondition: (order) => {
      const hasResaleItems = order.items?.some(
        (item) =>
          item.classificationSnapshot === 'REVENDA' ||
          item.classificationSnapshot === 'INSUMO',
      );
      return !hasResaleItems;
    },
  },
  {
    label: 'Imprimir Ficha OP',
    icon: 'ri-file-list-3-line',
    getUrl: (order) => {
      const po = order.productionOrders?.[0];
      return po ? `/production-orders/${po.id}/pdf` : null;
    },
    visibleAfter: ['FATURADO', 'PRODUZIR', 'EM_PRODUCAO', 'PRODUZIDO', 'ENTREGUE'],
  },
];

async function openAuthenticatedPdf(path: string) {
  const response = await api.get(path, { responseType: 'blob' });
  const blob = new Blob([response.data], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

type Props = {
  order: Order;
};

export function OrderActionsDropdown({ order }: Props) {
  const [loading, setLoading] = useState(false);

  const visibleActions = PDF_ACTIONS.filter((action) => {
    if (action.visibleAfter && !isStatusAfter(order.status, action.visibleAfter)) return false;
    if (action.hideCondition?.(order)) return false;
    return true;
  });

  if (visibleActions.length === 0) return null;

  async function handlePdfAction(action: PdfAction) {
    const path = action.getUrl(order);
    if (!path) return;
    setLoading(true);
    try {
      await openAuthenticatedPdf(path);
    } catch {
      // Error handled by api interceptor
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dropdown.Root>
      <Dropdown.Trigger asChild>
        <Button.Root variant='neutral' mode='stroke' size='small' disabled={loading}>
          <Button.Icon as='i' className={loading ? 'ri-loader-4-line animate-spin' : 'ri-more-2-line'} />
          Acoes
          <Button.Icon as='i' className='ri-arrow-down-s-line' />
        </Button.Root>
      </Dropdown.Trigger>

      <Dropdown.Content align='end' sideOffset={4}>
        {visibleActions.map((action) => {
          const url = action.getUrl(order);
          return (
            <Dropdown.Item
              key={action.label}
              disabled={!url || loading}
              onSelect={() => handlePdfAction(action)}
            >
              <Dropdown.ItemIcon as='i' className={action.icon} />
              {action.label}
            </Dropdown.Item>
          );
        })}
      </Dropdown.Content>
    </Dropdown.Root>
  );
}
