'use client';

import { RiShoppingBag3Line } from '@remixicon/react';
import * as Table from '@/components/ui/table';
import * as Badge from '@/components/ui/badge';
import { formatCents, formatDate } from '@/lib/formatters';
import { useSupplierPurchaseHistory } from '../../hooks/use-suppliers';

type SupplierPurchasesTabProps = {
  supplierId: string;
};

function getTypeBadge(type: 'QUOTATION' | 'ORDER') {
  if (type === 'QUOTATION') return { label: 'Cotação', color: 'blue' as const };
  return { label: 'Pedido', color: 'purple' as const };
}

function getStatusBadge(status: string) {
  const map: Record<string, { label: string; color: 'green' | 'blue' | 'orange' | 'red' | 'gray' }> = {
    SELECTED: { label: 'Selecionada', color: 'green' },
    RECEIVED: { label: 'Recebido', color: 'green' },
    CONFIRMED: { label: 'Confirmado', color: 'blue' },
    SENT: { label: 'Enviada', color: 'blue' },
    PENDING: { label: 'Pendente', color: 'orange' },
    DRAFT: { label: 'Rascunho', color: 'gray' },
    CANCELLED: { label: 'Cancelado', color: 'red' },
    REJECTED: { label: 'Rejeitada', color: 'red' },
  };
  return map[status] ?? { label: status, color: 'gray' as const };
}

export function SupplierPurchasesTab({ supplierId }: SupplierPurchasesTabProps) {
  const { data: purchases, isLoading } = useSupplierPurchaseHistory(supplierId);

  if (isLoading) {
    return (
      <div className='space-y-3'>
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className='h-16 animate-pulse rounded-xl border border-stroke-soft-200 bg-bg-weak-50'
          />
        ))}
      </div>
    );
  }

  if (!purchases || purchases.length === 0) {
    return (
      <div className='rounded-xl border border-stroke-soft-200 bg-bg-white-0 p-8 text-center shadow-regular-xs'>
        <RiShoppingBag3Line className='mx-auto size-8 text-text-soft-400' />
        <p className='mt-2 text-paragraph-sm text-text-soft-400'>
          Nenhuma compra encontrada para este fornecedor.
        </p>
      </div>
    );
  }

  return (
    <Table.Root>
      <Table.Header>
        <Table.Row>
          <Table.Head>Tipo</Table.Head>
          <Table.Head>Status</Table.Head>
          <Table.Head>Total</Table.Head>
          <Table.Head>Data Solicitação</Table.Head>
          <Table.Head>Data Entrega</Table.Head>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {purchases.map((purchase) => {
          const typeBadge = getTypeBadge(purchase.type);
          const statusBadge = getStatusBadge(purchase.status);
          return (
            <Table.Row key={purchase.id}>
              <Table.Cell>
                <Badge.Root variant='lighter' color={typeBadge.color} size='small'>
                  {typeBadge.label}
                </Badge.Root>
              </Table.Cell>
              <Table.Cell>
                <Badge.Root variant='lighter' color={statusBadge.color} size='small'>
                  {statusBadge.label}
                </Badge.Root>
              </Table.Cell>
              <Table.Cell>
                <span className='text-paragraph-sm text-text-strong-950'>
                  {formatCents(purchase.totalCents)}
                </span>
              </Table.Cell>
              <Table.Cell>
                <span className='text-paragraph-sm text-text-sub-600'>
                  {purchase.requestedAt ? formatDate(purchase.requestedAt) : '—'}
                </span>
              </Table.Cell>
              <Table.Cell>
                <span className='text-paragraph-sm text-text-sub-600'>
                  {purchase.deliveryDate ? formatDate(purchase.deliveryDate) : '—'}
                </span>
              </Table.Cell>
            </Table.Row>
          );
        })}
      </Table.Body>
    </Table.Root>
  );
}
