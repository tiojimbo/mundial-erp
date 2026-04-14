'use client';

import {
  RiMoneyDollarCircleLine,
  RiWalletLine,
  RiFileTextLine,
  RiSafeLine,
  RiArrowUpLine,
  RiArrowDownLine,
  RiAlertLine,
} from '@remixicon/react';
import { formatCents } from '@/lib/formatters';
import { useFinancialSummary } from '../hooks/use-financial';

export function FinancialAnalysis() {
  const { data: summary, isLoading } = useFinancialSummary();

  if (isLoading) {
    return (
      <div className='space-y-6'>
        <div>
          <h1 className='text-title-h5 text-text-strong-950'>
            Análise Financeira
          </h1>
          <p className='text-paragraph-sm text-text-sub-600'>
            Resumo financeiro da empresa.
          </p>
        </div>
        <div className='grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4'>
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className='h-28 animate-pulse rounded-lg bg-bg-weak-50'
            />
          ))}
        </div>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className='flex flex-col items-center justify-center gap-2 py-16 text-text-soft-400'>
        <p className='text-paragraph-sm'>
          Não foi possível carregar o resumo financeiro.
        </p>
      </div>
    );
  }

  return (
    <div className='space-y-6'>
      {/* Header */}
      <div>
        <h1 className='text-title-h5 text-text-strong-950'>
          Análise Financeira
        </h1>
        <p className='text-paragraph-sm text-text-sub-600'>
          Resumo financeiro da empresa.
        </p>
      </div>

      {/* Receivable Section */}
      <div>
        <h2 className='mb-3 flex items-center gap-2 text-label-md text-text-strong-950'>
          <RiArrowUpLine className='size-4 text-state-success-base' />
          Contas a Receber
        </h2>
        <div className='grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4'>
          <SummaryCard
            icon={RiMoneyDollarCircleLine}
            label='Total a Receber'
            value={formatCents(summary.receivable.totalCents)}
            color='default'
          />
          <SummaryCard
            icon={RiWalletLine}
            label='Recebido'
            value={formatCents(summary.receivable.paidCents)}
            color='success'
          />
          <SummaryCard
            icon={RiMoneyDollarCircleLine}
            label='Pendente'
            value={formatCents(summary.receivable.pendingCents)}
            color='warning'
          />
          <SummaryCard
            icon={RiAlertLine}
            label='Vencido'
            value={formatCents(summary.receivable.overdueCents)}
            subtitle={`${summary.receivable.overdueCount} título${summary.receivable.overdueCount !== 1 ? 's' : ''}`}
            color='error'
          />
        </div>
      </div>

      {/* Payable Section */}
      <div>
        <h2 className='mb-3 flex items-center gap-2 text-label-md text-text-strong-950'>
          <RiArrowDownLine className='size-4 text-state-error-base' />
          Contas a Pagar
        </h2>
        <div className='grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4'>
          <SummaryCard
            icon={RiMoneyDollarCircleLine}
            label='Total a Pagar'
            value={formatCents(summary.payable.totalCents)}
            color='default'
          />
          <SummaryCard
            icon={RiWalletLine}
            label='Pago'
            value={formatCents(summary.payable.paidCents)}
            color='success'
          />
          <SummaryCard
            icon={RiMoneyDollarCircleLine}
            label='Pendente'
            value={formatCents(summary.payable.pendingCents)}
            color='warning'
          />
          <SummaryCard
            icon={RiAlertLine}
            label='Vencido'
            value={formatCents(summary.payable.overdueCents)}
            subtitle={`${summary.payable.overdueCount} título${summary.payable.overdueCount !== 1 ? 's' : ''}`}
            color='error'
          />
        </div>
      </div>

      {/* Cash & Invoices */}
      <div className='grid grid-cols-1 gap-6 md:grid-cols-2'>
        {/* Cash Balance */}
        <div>
          <h2 className='mb-3 flex items-center gap-2 text-label-md text-text-strong-950'>
            <RiSafeLine className='size-4 text-primary-base' />
            Caixa
          </h2>
          <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
            <SummaryCard
              icon={RiSafeLine}
              label='Saldo Atual'
              value={formatCents(summary.cashBalance.currentCents)}
              color={summary.cashBalance.isOpen ? 'success' : 'default'}
            />
            <div className='flex items-center rounded-lg border border-stroke-soft-200 p-4'>
              <div>
                <span className='text-paragraph-xs text-text-soft-400'>
                  Status
                </span>
                <p className='text-label-sm text-text-strong-950'>
                  {summary.cashBalance.isOpen ? 'Caixa aberto' : 'Caixa fechado'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Invoices */}
        <div>
          <h2 className='mb-3 flex items-center gap-2 text-label-md text-text-strong-950'>
            <RiFileTextLine className='size-4 text-primary-base' />
            Notas Fiscais
          </h2>
          <div className='grid grid-cols-1 gap-4 sm:grid-cols-3'>
            <SummaryCard
              icon={RiFileTextLine}
              label='Emitidas'
              value={String(summary.invoices.issuedCount)}
              color='default'
            />
            <SummaryCard
              icon={RiAlertLine}
              label='Canceladas'
              value={String(summary.invoices.cancelledCount)}
              color='error'
            />
            <SummaryCard
              icon={RiMoneyDollarCircleLine}
              label='Total Emitido'
              value={formatCents(summary.invoices.totalIssuedCents)}
              color='success'
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ===== Summary Card =====

type SummaryCardProps = {
  icon: React.ElementType;
  label: string;
  value: string;
  subtitle?: string;
  color: 'default' | 'success' | 'warning' | 'error';
};

const COLOR_MAP: Record<SummaryCardProps['color'], string> = {
  default: 'text-text-strong-950',
  success: 'text-state-success-base',
  warning: 'text-state-warning-base',
  error: 'text-state-error-base',
};

function SummaryCard({ icon: Icon, label, value, subtitle, color }: SummaryCardProps) {
  return (
    <div className='rounded-lg border border-stroke-soft-200 p-4'>
      <div className='mb-2 flex items-center gap-2'>
        <Icon className='size-4 text-text-soft-400' />
        <span className='text-paragraph-xs text-text-soft-400'>{label}</span>
      </div>
      <p className={`text-title-h6 ${COLOR_MAP[color]}`}>{value}</p>
      {subtitle && (
        <p className='mt-1 text-paragraph-xs text-text-soft-400'>{subtitle}</p>
      )}
    </div>
  );
}
