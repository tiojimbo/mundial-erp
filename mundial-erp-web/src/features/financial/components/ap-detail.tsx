'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  RiArrowLeftLine,
  RiMoneyDollarCircleLine,
} from '@remixicon/react';
import * as Button from '@/components/ui/button';
import { formatCents, formatDate } from '@/lib/formatters';
import { useAccountPayable } from '../hooks/use-financial';
import { PaymentStatusBadge } from './payment-status-badge';
import { APPaymentDialog } from './ap-payment-dialog';

type Props = {
  apId: string;
};

export function APDetail({ apId }: Props) {
  const { data: ap, isLoading } = useAccountPayable(apId);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);

  if (isLoading) {
    return (
      <div className='space-y-4'>
        <div className='h-8 w-48 animate-pulse rounded bg-bg-weak-50' />
        <div className='h-64 animate-pulse rounded-lg bg-bg-weak-50' />
      </div>
    );
  }

  if (!ap) {
    return (
      <div className='flex flex-col items-center justify-center gap-2 py-16 text-text-soft-400'>
        <p className='text-paragraph-sm'>Conta a pagar não encontrada.</p>
        <Button.Root asChild variant='neutral' mode='ghost' size='small'>
          <Link href='/financeiro/contas-a-pagar'>Voltar</Link>
        </Button.Root>
      </div>
    );
  }

  const balanceCents = ap.amountCents - ap.paidAmountCents;
  const canPay = ap.status !== 'PAID' && ap.status !== 'CANCELLED';

  return (
    <div className='space-y-6'>
      {/* Header */}
      <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
        <div className='flex items-center gap-3'>
          <Button.Root asChild variant='neutral' mode='ghost' size='xsmall'>
            <Link href='/financeiro/contas-a-pagar'>
              <Button.Icon as={RiArrowLeftLine} />
            </Link>
          </Button.Root>
          <div>
            <h1 className='text-title-h5 text-text-strong-950'>
              {ap.description}
            </h1>
            <p className='text-paragraph-sm text-text-sub-600'>
              Conta a Pagar
            </p>
          </div>
        </div>
        <div className='flex items-center gap-2'>
          <PaymentStatusBadge status={ap.status} />
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
            {formatCents(ap.amountCents)}
          </p>
        </div>
        <div className='rounded-lg border border-stroke-soft-200 p-4'>
          <span className='text-paragraph-xs text-text-soft-400'>
            Valor Pago
          </span>
          <p className='text-title-h6 text-state-success-base'>
            {formatCents(ap.paidAmountCents)}
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
            {formatDate(ap.dueDate)}
          </p>
        </div>
      </div>

      {/* Details */}
      <div className='rounded-lg border border-stroke-soft-200 p-6'>
        <h2 className='mb-4 text-label-md text-text-strong-950'>Detalhes</h2>
        <dl className='grid grid-cols-1 gap-4 md:grid-cols-2'>
          <div>
            <dt className='text-paragraph-xs text-text-soft-400'>
              Fornecedor
            </dt>
            <dd className='text-paragraph-sm text-text-strong-950'>
              {ap.supplier ? (
                <Link
                  href={`/compras/fornecedores/${ap.supplierId}`}
                  className='text-primary-base hover:underline'
                >
                  {ap.supplier.name}
                </Link>
              ) : (
                '—'
              )}
            </dd>
          </div>
          <div>
            <dt className='text-paragraph-xs text-text-soft-400'>Categoria</dt>
            <dd className='text-paragraph-sm text-text-strong-950'>
              {ap.category?.name ?? '—'}
            </dd>
          </div>
          <div>
            <dt className='text-paragraph-xs text-text-soft-400'>
              Data de Pagamento
            </dt>
            <dd className='text-paragraph-sm text-text-strong-950'>
              {ap.paidDate ? formatDate(ap.paidDate) : '—'}
            </dd>
          </div>
          <div>
            <dt className='text-paragraph-xs text-text-soft-400'>
              Criado em
            </dt>
            <dd className='text-paragraph-sm text-text-strong-950'>
              {formatDate(ap.createdAt)}
            </dd>
          </div>
        </dl>
      </div>

      {/* Payment Dialog */}
      {showPaymentDialog && (
        <APPaymentDialog
          apId={apId}
          balanceCents={balanceCents}
          onClose={() => setShowPaymentDialog(false)}
        />
      )}
    </div>
  );
}
