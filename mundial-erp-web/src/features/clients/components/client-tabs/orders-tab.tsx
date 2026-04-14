'use client';

import Link from 'next/link';
import { RiShoppingBag3Line } from '@remixicon/react';
import * as Table from '@/components/ui/table';
import * as Badge from '@/components/ui/badge';
import { formatCents, formatDate } from '@/lib/formatters';
import { useClientOrders } from '../../hooks/use-clients';

type ClientOrdersTabProps = {
  clientId: string;
};

function getStatusBadge(status: string) {
  const map: Record<string, { label: string; color: 'green' | 'blue' | 'orange' | 'red' | 'gray' }> = {
    COMPLETED: { label: 'Concluído', color: 'green' },
    IN_PROGRESS: { label: 'Em Andamento', color: 'blue' },
    PENDING: { label: 'Pendente', color: 'orange' },
    CANCELLED: { label: 'Cancelado', color: 'red' },
  };
  return map[status] ?? { label: status, color: 'gray' as const };
}

export function ClientOrdersTab({ clientId }: ClientOrdersTabProps) {
  const { data: orders, isLoading } = useClientOrders(clientId);

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

  if (!orders || orders.length === 0) {
    return (
      <div className='rounded-xl border border-stroke-soft-200 bg-bg-white-0 p-8 text-center shadow-regular-xs'>
        <RiShoppingBag3Line className='mx-auto size-8 text-text-soft-400' />
        <p className='mt-2 text-paragraph-sm text-text-soft-400'>
          Nenhum pedido encontrado para este cliente.
        </p>
      </div>
    );
  }

  return (
    <Table.Root>
      <Table.Header>
        <Table.Row>
          <Table.Head>Código</Table.Head>
          <Table.Head>Status</Table.Head>
          <Table.Head>Total</Table.Head>
          <Table.Head>Data</Table.Head>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {orders.map((order) => {
          const badge = getStatusBadge(order.status);
          return (
            <Table.Row key={order.id}>
              <Table.Cell>
                <Link
                  href={`/comercial/pedidos/${order.id}`}
                  className='text-label-sm text-primary-base transition hover:text-primary-darker'
                >
                  {order.orderNumber}
                </Link>
              </Table.Cell>
              <Table.Cell>
                <Badge.Root variant='light' color={badge.color} size='small'>
                  {badge.label}
                </Badge.Root>
              </Table.Cell>
              <Table.Cell>
                <span className='text-paragraph-sm text-text-strong-950'>
                  {formatCents(order.totalCents)}
                </span>
              </Table.Cell>
              <Table.Cell>
                <span className='text-paragraph-sm text-text-sub-600'>
                  {formatDate(order.createdAt)}
                </span>
              </Table.Cell>
            </Table.Row>
          );
        })}
      </Table.Body>
    </Table.Root>
  );
}
