'use client';

import { useState } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  RiShoppingBag3Line,
  RiMoneyDollarCircleLine,
  RiArrowUpLine,
  RiArrowDownLine,
} from '@remixicon/react';
import { formatCents, formatDate } from '@/lib/formatters';
import { PeriodSelector } from './period-selector';
import { useSalesReport } from '../hooks/use-reports';
import type { ReportFilters } from '../types/report.types';

export function SalesReportView() {
  const [filters, setFilters] = useState<ReportFilters | undefined>();
  const { data: report, isLoading } = useSalesReport(filters);

  return (
    <div className='space-y-6'>
      <div>
        <h1 className='text-title-h5 text-text-strong-950'>
          Relatório de Vendas
        </h1>
        <p className='text-paragraph-sm text-text-sub-600'>
          Análise de vendas por período, produto e cliente.
        </p>
      </div>

      <PeriodSelector onApply={setFilters} isLoading={isLoading} />

      {/* Loading */}
      {isLoading && (
        <div className='grid grid-cols-1 gap-4 md:grid-cols-4'>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className='h-24 animate-pulse rounded-lg bg-bg-weak-50' />
          ))}
        </div>
      )}

      {/* Initial state */}
      {!filters && !isLoading && (
        <div className='flex flex-col items-center justify-center py-16 text-text-soft-400'>
          <p className='text-paragraph-sm'>
            Selecione um período para gerar o relatório.
          </p>
        </div>
      )}

      {/* Report */}
      {report && (
        <div className='space-y-6'>
          {/* Summary */}
          <div className='grid grid-cols-1 gap-4 md:grid-cols-4'>
            <KPICard
              icon={RiShoppingBag3Line}
              label='Total de Pedidos'
              value={String(report.summary.totalOrdersCount)}
            />
            <KPICard
              icon={RiMoneyDollarCircleLine}
              label='Faturamento'
              value={formatCents(report.summary.totalCents)}
            />
            <KPICard
              icon={RiMoneyDollarCircleLine}
              label='Ticket Médio'
              value={formatCents(report.summary.avgTicketCents)}
            />
            <div className='rounded-lg border border-stroke-soft-200 bg-bg-white-0 p-4'>
              <p className='text-paragraph-xs text-text-sub-600'>Crescimento</p>
              <div className='mt-1 flex items-center gap-1'>
                {report.summary.growthPercentage >= 0 ? (
                  <RiArrowUpLine className='size-4 text-state-success-base' />
                ) : (
                  <RiArrowDownLine className='size-4 text-state-error-base' />
                )}
                <p
                  className={`text-title-h6 ${
                    report.summary.growthPercentage >= 0
                      ? 'text-state-success-base'
                      : 'text-state-error-base'
                  }`}
                >
                  {report.summary.growthPercentage > 0 ? '+' : ''}
                  {report.summary.growthPercentage.toFixed(1)}%
                </p>
              </div>
            </div>
          </div>

          {/* Daily Sales Chart */}
          <div className='rounded-lg border border-stroke-soft-200 bg-bg-white-0 p-4'>
            <h3 className='mb-4 text-label-sm text-text-strong-950'>
              Vendas Diárias
            </h3>
            <div className='h-64'>
              <ResponsiveContainer width='100%' height='100%'>
                <BarChart
                  data={report.daily.map((d) => ({
                    ...d,
                    date: formatDate(d.date),
                    total: d.totalCents / 100,
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
                  <Bar
                    dataKey='total'
                    fill='var(--color-primary-base)'
                    radius={[4, 4, 0, 0]}
                    name='Total (R$)'
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top Products & Clients */}
          <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
            {/* By Product */}
            <div className='rounded-lg border border-stroke-soft-200 bg-bg-white-0 p-4'>
              <h3 className='mb-3 text-label-sm text-text-strong-950'>
                Por Produto
              </h3>
              <div className='space-y-2'>
                {report.byProduct.slice(0, 10).map((item) => (
                  <div
                    key={item.productId}
                    className='flex items-center justify-between border-b border-stroke-soft-200 py-2 last:border-0'
                  >
                    <div>
                      <p className='text-paragraph-sm text-text-strong-950'>
                        {item.productName}
                      </p>
                      <p className='text-paragraph-xs text-text-soft-400'>
                        {item.quantitySold} vendido{item.quantitySold !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <p className='text-label-sm text-text-strong-950'>
                      {formatCents(item.totalCents)}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* By Client */}
            <div className='rounded-lg border border-stroke-soft-200 bg-bg-white-0 p-4'>
              <h3 className='mb-3 text-label-sm text-text-strong-950'>
                Por Cliente
              </h3>
              <div className='space-y-2'>
                {report.byClient.slice(0, 10).map((item) => (
                  <div
                    key={item.clientId}
                    className='flex items-center justify-between border-b border-stroke-soft-200 py-2 last:border-0'
                  >
                    <div>
                      <p className='text-paragraph-sm text-text-strong-950'>
                        {item.clientName}
                      </p>
                      <p className='text-paragraph-xs text-text-soft-400'>
                        {item.ordersCount} pedido{item.ordersCount !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <p className='text-label-sm text-text-strong-950'>
                      {formatCents(item.totalCents)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function KPICard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className='rounded-lg border border-stroke-soft-200 bg-bg-white-0 p-4'>
      <div className='mb-2 flex items-center gap-2'>
        <Icon className='size-4 text-text-soft-400' />
        <span className='text-paragraph-xs text-text-soft-400'>{label}</span>
      </div>
      <p className='text-title-h6 text-text-strong-950'>{value}</p>
    </div>
  );
}
