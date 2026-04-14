'use client';

import {
  RiMoneyDollarCircleLine,
  RiCheckboxCircleLine,
  RiTimeLine,
  RiErrorWarningLine,
} from '@remixicon/react';
import { formatCents } from '@/lib/formatters';
import { useClientFinancials } from '../../hooks/use-clients';

type ClientFinancialTabProps = {
  clientId: string;
};

const financialCards = [
  {
    key: 'totalAmountCents' as const,
    label: 'Total a Receber',
    icon: RiMoneyDollarCircleLine,
    color: 'text-information-base',
    bgColor: 'bg-information-lighter',
  },
  {
    key: 'totalPaidCents' as const,
    label: 'Total Pago',
    icon: RiCheckboxCircleLine,
    color: 'text-success-base',
    bgColor: 'bg-success-lighter',
  },
  {
    key: 'totalPendingCents' as const,
    label: 'Pendente',
    icon: RiTimeLine,
    color: 'text-warning-base',
    bgColor: 'bg-warning-lighter',
  },
  {
    key: 'totalOverdueCents' as const,
    label: 'Vencido',
    icon: RiErrorWarningLine,
    color: 'text-error-base',
    bgColor: 'bg-error-lighter',
  },
];

export function ClientFinancialTab({ clientId }: ClientFinancialTabProps) {
  const { data: financials, isLoading } = useClientFinancials(clientId);

  if (isLoading) {
    return (
      <div className='grid gap-4 sm:grid-cols-2'>
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className='h-24 animate-pulse rounded-xl border border-stroke-soft-200 bg-bg-weak-50'
          />
        ))}
      </div>
    );
  }

  if (!financials) {
    return (
      <div className='rounded-xl border border-stroke-soft-200 bg-bg-white-0 p-8 text-center shadow-regular-xs'>
        <RiMoneyDollarCircleLine className='mx-auto size-8 text-text-soft-400' />
        <p className='mt-2 text-paragraph-sm text-text-soft-400'>
          Dados financeiros não disponíveis.
        </p>
      </div>
    );
  }

  return (
    <div className='grid gap-4 sm:grid-cols-2'>
      {financialCards.map((card) => (
        <div
          key={card.key}
          className='flex items-center gap-4 rounded-xl border border-stroke-soft-200 bg-bg-white-0 p-5 shadow-regular-xs'
        >
          <div
            className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${card.bgColor}`}
          >
            <card.icon className={`size-5 ${card.color}`} />
          </div>
          <div>
            <p className='text-paragraph-xs text-text-sub-600'>{card.label}</p>
            <p className='mt-0.5 text-title-h6 text-text-strong-950'>
              {formatCents(financials[card.key])}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
