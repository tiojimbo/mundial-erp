'use client';

import * as Table from '@/components/ui/table';
import * as Badge from '@/components/ui/badge';
import { formatCurrency, formatDate } from '../../lib/format';
import type { AccountReceivable, PaymentStatus } from '../../types/order.types';

type BadgeColor = React.ComponentProps<typeof Badge.Root>['color'];

const PAYMENT_STATUS_MAP: Record<PaymentStatus, { label: string; color: BadgeColor }> = {
  PENDING: { label: 'Pendente', color: 'orange' },
  PARTIAL: { label: 'Parcial', color: 'yellow' },
  PAID: { label: 'Pago', color: 'green' },
  OVERDUE: { label: 'Vencido', color: 'red' },
  CANCELLED: { label: 'Cancelado', color: 'gray' },
};

type Props = {
  accountsReceivable: AccountReceivable[];
};

export function FinancialTab({ accountsReceivable }: Props) {
  if (accountsReceivable.length === 0) {
    return (
      <div className='flex flex-col items-center justify-center gap-2 py-12 text-text-soft-400'>
        <i className='ri-money-dollar-circle-line text-3xl' />
        <p className='text-paragraph-sm'>Nenhuma parcela registrada</p>
        <p className='text-paragraph-xs'>
          Parcelas sao criadas automaticamente ao enviar para faturamento
        </p>
      </div>
    );
  }

  const totalAmount = accountsReceivable.reduce((sum, ar) => sum + ar.amountCents, 0);
  const totalPaid = accountsReceivable.reduce((sum, ar) => sum + ar.paidAmountCents, 0);

  return (
    <div className='flex flex-col gap-4'>
      {/* Summary cards */}
      <div className='grid grid-cols-1 gap-3 md:grid-cols-3'>
        <div className='rounded-lg border border-stroke-soft-200 p-4'>
          <span className='text-paragraph-xs text-text-soft-400'>Total a Receber</span>
          <p className='text-title-h6 text-text-strong-950'>{formatCurrency(totalAmount)}</p>
        </div>
        <div className='rounded-lg border border-stroke-soft-200 p-4'>
          <span className='text-paragraph-xs text-text-soft-400'>Total Pago</span>
          <p className='text-title-h6 text-state-success-base'>{formatCurrency(totalPaid)}</p>
        </div>
        <div className='rounded-lg border border-stroke-soft-200 p-4'>
          <span className='text-paragraph-xs text-text-soft-400'>Saldo Pendente</span>
          <p className='text-title-h6 text-state-warning-base'>
            {formatCurrency(totalAmount - totalPaid)}
          </p>
        </div>
      </div>

      {/* Parcels table */}
      <Table.Root>
        <Table.Header>
          <Table.Row>
            <Table.Head>Descricao</Table.Head>
            <Table.Head className='text-right'>Valor</Table.Head>
            <Table.Head className='text-right'>Pago</Table.Head>
            <Table.Head>Vencimento</Table.Head>
            <Table.Head>Pgto em</Table.Head>
            <Table.Head>Status</Table.Head>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {accountsReceivable.map((ar) => {
            const statusConfig = PAYMENT_STATUS_MAP[ar.status] ?? {
              label: ar.status,
              color: 'gray' as BadgeColor,
            };
            return (
              <Table.Row key={ar.id}>
                <Table.Cell>{ar.description}</Table.Cell>
                <Table.Cell className='text-right font-medium'>
                  {formatCurrency(ar.amountCents)}
                </Table.Cell>
                <Table.Cell className='text-right'>
                  {formatCurrency(ar.paidAmountCents)}
                </Table.Cell>
                <Table.Cell>{formatDate(ar.dueDate)}</Table.Cell>
                <Table.Cell>
                  {ar.paidDate ? formatDate(ar.paidDate) : '-'}
                </Table.Cell>
                <Table.Cell>
                  <Badge.Root color={statusConfig.color} variant='lighter' size='small'>
                    <Badge.Dot />
                    {statusConfig.label}
                  </Badge.Root>
                </Table.Cell>
              </Table.Row>
            );
          })}
        </Table.Body>
      </Table.Root>
    </div>
  );
}
