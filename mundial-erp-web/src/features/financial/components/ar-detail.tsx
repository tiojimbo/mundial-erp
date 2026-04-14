'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  RiArrowLeftLine,
  RiMoneyDollarCircleLine,
} from '@remixicon/react';
import * as Button from '@/components/ui/button';
import { formatCents, formatDate } from '@/lib/formatters';
import { useAccountReceivable } from '../hooks/use-financial';
import { PaymentStatusBadge } from './payment-status-badge';
import { ARPaymentDialog } from './ar-payment-dialog';

type Props = {
  arId: string;
};

export function ARDetail({ arId }: Props) {
  const { data: ar, isLoading } = useAccountReceivable(arId);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);

  if (isLoading) {
    return (
      <div className='space-y-4'>
        <div className='h-8 w-48 animate-pulse rounded bg-bg-weak-50' />
        <div className='h-64 animate-pulse rounded-lg bg-bg-weak-50' />
      </div>
    );
  }

  if (!ar) {
    return (
      <div className='flex flex-col items-center justify-center gap-2 py-16 text-text-soft-400'>
        <p className='text-paragraph-sm'>Conta a receber não encontrada.</p>
        <Button.Root asChild variant='neutral' mode='ghost' size='small'>
          <Link href='/financeiro/contas-a-receber'>Voltar</Link>
        </Button.Root>
      </div>
    );
  }

  const balanceCents = ar.amountCents - ar.paidAmountCents;
  const canPay = ar.status !== 'PAID' && ar.status !== 'CANCELLED';

  return (
    <div className='space-y-6'>
      {/* Header */}
      <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
        <div className='flex items-center gap-3'>
          <Button.Root asChild variant='neutral' mode='ghost' size='xsmall'>
            <Link href='/financeiro/contas-a-receber'>
              <Button.Icon as={RiArrowLeftLine} />
            </Link>
          </Button.Root>
          <div>
            <h1 className='text-title-h5 text-text-strong-950'>
              {ar.description}
            </h1>
            <p className='text-paragraph-sm text-text-sub-600'>
              Conta a Receber
            </p>
          </div>
        </div>
        <div className='flex items-center gap-2'>
          <PaymentStatusBadge status={ar.status} />
          {canPay && (
            <Button.Root
              variant='primary'
              mode='filled'
              size='medium'
              onClick={() => setShowPaymentDialog(true)}
            >
              <Button.Icon as={RiMoneyDollarCircleLine} />
              Registrar Pagamento
            </Button.Root>
          )}
        </div>
      </div>

      {/* Summary cards */}
      <div className='grid grid-cols-1 gap-4 md:grid-cols-4'>
        <div className='rounded-lg border border-stroke-soft-200 p-4'>
          <span className='text-paragraph-xs text-text-soft-400'>
            Valor Total
          </span>
          <p className='text-title-h6 text-text-strong-950'>
            {formatCents(ar.amountCents)}
          </p>
        </div>
        <div className='rounded-lg border border-stroke-soft-200 p-4'>
          <span className='text-paragraph-xs text-text-soft-400'>
            Valor Pago
          </span>
          <p className='text-title-h6 text-state-success-base'>
            {formatCents(ar.paidAmountCents)}
          </p>
        </div>
        <div className='rounded-lg border border-stroke-soft-200 p-4'>
          <span className='text-paragraph-xs text-text-soft-400'>
            Saldo Pendente
          </span>
          <p className='text-title-h6 text-state-warning-base'>
            {formatCents(balanceCents)}
          </p>
        </div>
        <div className='rounded-lg border border-stroke-soft-200 p-4'>
          <span className='text-paragraph-xs text-text-soft-400'>
            Vencimento
          </span>
          <p className='text-title-h6 text-text-strong-950'>
            {formatDate(ar.dueDate)}
          </p>
        </div>
      </div>

      {/* Details */}
      <div className='rounded-lg border border-stroke-soft-200 p-6'>
        <h2 className='mb-4 text-label-md text-text-strong-950'>Detalhes</h2>
        <dl className='grid grid-cols-1 gap-4 md:grid-cols-2'>
          <div>
            <dt className='text-paragraph-xs text-text-soft-400'>Cliente</dt>
            <dd className='text-paragraph-sm text-text-strong-950'>
              {ar.client ? (
                <Link
                  href={`/comercial/clientes/${ar.clientId}`}
                  className='text-primary-base hover:underline'
                >
                  {ar.client.name}
                </Link>
              ) : (
                '—'
              )}
            </dd>
          </div>
          <div>
            <dt className='text-paragraph-xs text-text-soft-400'>Pedido</dt>
            <dd className='text-paragraph-sm text-text-strong-950'>
              {ar.order ? (
                <Link
                  href={`/comercial/pedidos/${ar.orderId}`}
                  className='text-primary-base hover:underline'
                >
                  #{ar.order.orderNumber}
                </Link>
              ) : (
                '—'
              )}
            </dd>
          </div>
          <div>
            <dt className='text-paragraph-xs text-text-soft-400'>
              Data de Pagamento
            </dt>
            <dd className='text-paragraph-sm text-text-strong-950'>
              {ar.paidDate ? formatDate(ar.paidDate) : '—'}
            </dd>
          </div>
          <div>
            <dt className='text-paragraph-xs text-text-soft-400'>
              Criado em
            </dt>
            <dd className='text-paragraph-sm text-text-strong-950'>
              {formatDate(ar.createdAt)}
            </dd>
          </div>
        </dl>
      </div>

      {/* Payment Dialog */}
      {showPaymentDialog && (
        <ARPaymentDialog
          arId={arId}
          balanceCents={balanceCents}
          onClose={() => setShowPaymentDialog(false)}
        />
      )}
    </div>
  );
}
