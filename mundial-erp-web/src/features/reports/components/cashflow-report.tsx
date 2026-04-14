'use client';

import { useState } from 'react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import {
  RiArrowUpLine,
  RiArrowDownLine,
  RiWalletLine,
} from '@remixicon/react';
import { formatCents, formatDate } from '@/lib/formatters';
import { PeriodSelector } from './period-selector';
import { useCashFlowReport } from '../hooks/use-reports';
import type { ReportFilters } from '../types/report.types';

export function CashFlowReportView() {
  const [filters, setFilters] = useState<ReportFilters | undefined>();
  const { data: report, isLoading } = useCashFlowReport(filters);

  return (
    <div className='space-y-6'>
      <div>
        <h1 className='text-title-h5 text-text-strong-950'>Fluxo de Caixa</h1>
        <p className='text-paragraph-sm text-text-sub-600'>
          Entradas, saídas e saldo acumulado.
        </p>
      </div>

      <PeriodSelector onApply={setFilters} isLoading={isLoading} />

      {/* Loading */}
      {isLoading && (
        <div className='space-y-4'>
          <div className='grid grid-cols-1 gap-4 md:grid-cols-3'>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className='h-24 animate-pulse rounded-lg bg-bg-weak-50' />
            ))}
          </div>
          <div className='h-64 animate-pulse rounded-lg bg-bg-weak-50' />
        </div>
      )}

      {/* Initial */}
      {!filters && !isLoading && (
        <div className='flex flex-col items-center justify-center py-16 text-text-soft-400'>
          <p className='text-paragraph-sm'>
            Selecione um período para gerar o fluxo de caixa.
          </p>
        </div>
      )}

      {/* Report */}
      {report && (
        <div className='space-y-6'>
          {/* Summary */}
          <div className='grid grid-cols-1 gap-4 md:grid-cols-5'>
            <SummaryCard
              icon={RiWalletLine}
              label='Saldo Inicial'
              valueCents={report.openingBalanceCents}
              color='default'
            />
            <SummaryCard
              icon={RiArrowUpLine}
              label='Total Entradas'
              valueCents={report.totalInflowCents}
              color='success'
            />
            <SummaryCard
              icon={RiArrowDownLine}
              label='Total Saídas'
              valueCents={report.totalOutflowCents}
              color='error'
            />
            <SummaryCard
              icon={RiWalletLine}
              label='Fluxo Líquido'
              valueCents={report.netFlowCents}
              color={report.netFlowCents >= 0 ? 'success' : 'error'}
            />
            <SummaryCard
              icon={RiWalletLine}
              label='Saldo Final'
              valueCents={report.closingBalanceCents}
              color={report.closingBalanceCents >= 0 ? 'success' : 'error'}
            />
          </div>

          {/* Balance Chart */}
          <div className='rounded-lg border border-stroke-soft-200 bg-bg-white-0 p-4'>
            <h3 className='mb-4 text-label-sm text-text-strong-950'>
              Evolução do Saldo
            </h3>
            <div className='h-64'>
              <ResponsiveContainer width='100%' height='100%'>
                <AreaChart
                  data={report.entries.map((e) => ({
                    ...e,
                    date: formatDate(e.date),
                    balance: e.balanceCents / 100,
                  }))}
                  margin={{ top: 8, right: 8, bottom: 0, left: -16 }}
                >
                  <CartesianGrid
                    strokeDasharray='3 3'
                    stroke='var(--color-stroke-soft-200)'
                  />
                  <XAxis
                    dataKey='date'
                    tick={{ fontSize: 11 }}
                    stroke='var(--color-text-soft-400)'
                  />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    stroke='var(--color-text-soft-400)'
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 8,
                      border: '1px solid var(--color-stroke-soft-200)',
                      fontSize: 12,
                    }}
                  />
                  <Area
                    type='monotone'
                    dataKey='balance'
                    stroke='var(--color-primary-base)'
                    fill='var(--color-primary-base)'
                    fillOpacity={0.12}
                    strokeWidth={2}
                    name='Saldo (R$)'
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Inflow vs Outflow */}
          <div className='rounded-lg border border-stroke-soft-200 bg-bg-white-0 p-4'>
            <h3 className='mb-4 text-label-sm text-text-strong-950'>
              Entradas vs Saídas
            </h3>
            <div className='h-64'>
              <ResponsiveContainer width='100%' height='100%'>
                <BarChart
                  data={report.entries.map((e) => ({
                    date: formatDate(e.date),
                    entradas: e.inflowCents / 100,
                    saidas: e.outflowCents / 100,
                  }))}
                  margin={{ top: 8, right: 8, bottom: 0, left: -16 }}
                >
                  <CartesianGrid
                    strokeDasharray='3 3'
                    stroke='var(--color-stroke-soft-200)'
                  />
                  <XAxis
                    dataKey='date'
                    tick={{ fontSize: 11 }}
                    stroke='var(--color-text-soft-400)'
                  />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    stroke='var(--color-text-soft-400)'
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 8,
                      border: '1px solid var(--color-stroke-soft-200)',
                      fontSize: 12,
                    }}
                  />
                  <Legend iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                  <Bar
                    dataKey='entradas'
                    fill='var(--color-state-success-base)'
                    radius={[4, 4, 0, 0]}
                    name='Entradas'
                  />
                  <Bar
                    dataKey='saidas'
                    fill='var(--color-state-error-base)'
                    radius={[4, 4, 0, 0]}
                    name='Saídas'
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Daily Table */}
          <div className='rounded-lg border border-stroke-soft-200 bg-bg-white-0'>
            <table className='w-full'>
              <thead>
                <tr className='border-b border-stroke-soft-200'>
                  <th className='px-4 py-3 text-left text-label-xs text-text-sub-600'>
                    Data
                  </th>
                  <th className='px-4 py-3 text-right text-label-xs text-text-sub-600'>
                    Entradas
                  </th>
                  <th className='px-4 py-3 text-right text-label-xs text-text-sub-600'>
                    Saídas
                  </th>
                  <th className='px-4 py-3 text-right text-label-xs text-text-sub-600'>
                    Saldo
                  </th>
                </tr>
              </thead>
              <tbody>
                {report.entries.map((entry, i) => (
                  <tr
                    key={i}
                    className='border-b border-stroke-soft-200 last:border-0'
                  >
                    <td className='px-4 py-2.5 text-paragraph-sm text-text-strong-950'>
                      {formatDate(entry.date)}
                    </td>
                    <td className='px-4 py-2.5 text-right text-paragraph-sm text-state-success-base'>
                      +{formatCents(entry.inflowCents)}
                    </td>
                    <td className='px-4 py-2.5 text-right text-paragraph-sm text-state-error-base'>
                      -{formatCents(entry.outflowCents)}
                    </td>
                    <td
                      className={`px-4 py-2.5 text-right text-label-sm ${
                        entry.balanceCents >= 0
                          ? 'text-text-strong-950'
                          : 'text-state-error-base'
                      }`}
                    >
                      {formatCents(entry.balanceCents)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  valueCents,
  color,
}: {
  icon: React.ElementType;
  label: string;
  valueCents: number;
  color: 'default' | 'success' | 'error';
}) {
  const colorClass =
    color === 'success'
      ? 'text-state-success-base'
      : color === 'error'
        ? 'text-state-error-base'
        : 'text-text-strong-950';

  return (
    <div className='rounded-lg border border-stroke-soft-200 bg-bg-white-0 p-4'>
      <div className='mb-1 flex items-center gap-2'>
        <Icon className='size-4 text-text-soft-400' />
        <span className='text-paragraph-xs text-text-soft-400'>{label}</span>
      </div>
      <p className={`text-title-h6 ${colorClass}`}>
        {formatCents(valueCents)}
      </p>
    </div>
  );
}
