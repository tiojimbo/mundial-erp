'use client';

import { useState } from 'react';
import { formatCents } from '@/lib/formatters';
import { PeriodSelector } from './period-selector';
import { useDREReport } from '../hooks/use-reports';
import type { ReportFilters, DRELineItem } from '../types/report.types';

export function DREReportView() {
  const [filters, setFilters] = useState<ReportFilters | undefined>();
  const { data: report, isLoading } = useDREReport(filters);

  return (
    <div className='space-y-6'>
      <div>
        <h1 className='text-title-h5 text-text-strong-950'>DRE</h1>
        <p className='text-paragraph-sm text-text-sub-600'>
          Demonstrativo de Resultados do Exercício.
        </p>
      </div>

      <PeriodSelector onApply={setFilters} isLoading={isLoading} />

      {/* Loading */}
      {isLoading && (
        <div className='space-y-2'>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className='h-10 animate-pulse rounded-lg bg-bg-weak-50' />
          ))}
        </div>
      )}

      {/* No data */}
      {!isLoading && !report && filters && (
        <div className='flex flex-col items-center justify-center py-16 text-text-soft-400'>
          <p className='text-paragraph-sm'>Sem dados para o período selecionado.</p>
        </div>
      )}

      {/* Report Content */}
      {report && (
        <div className='space-y-4'>
          {/* Summary Cards */}
          <div className='grid grid-cols-1 gap-4 md:grid-cols-3'>
            <SummaryKPI
              label='Receita Total'
              valueCents={report.totalRevenueCents}
              color='success'
            />
            <SummaryKPI
              label='Despesas Totais'
              valueCents={report.totalExpensesCents}
              color='error'
            />
            <SummaryKPI
              label='Resultado Líquido'
              valueCents={report.netResultCents}
              color={report.netResultCents >= 0 ? 'success' : 'error'}
            />
          </div>

          {/* DRE Table */}
          <div className='rounded-lg border border-stroke-soft-200 bg-bg-white-0'>
            <table className='w-full'>
              <thead>
                <tr className='border-b border-stroke-soft-200'>
                  <th className='px-4 py-3 text-left text-label-xs text-text-sub-600'>
                    Conta
                  </th>
                  <th className='px-4 py-3 text-right text-label-xs text-text-sub-600'>
                    Valor
                  </th>
                  <th className='px-4 py-3 text-right text-label-xs text-text-sub-600'>
                    %
                  </th>
                </tr>
              </thead>
              <tbody>
                {report.lines.map((line, i) => (
                  <DRERow key={i} item={line} depth={0} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Initial state */}
      {!filters && (
        <div className='flex flex-col items-center justify-center py-16 text-text-soft-400'>
          <p className='text-paragraph-sm'>
            Selecione um período para gerar o DRE.
          </p>
        </div>
      )}
    </div>
  );
}

function DRERow({ item, depth }: { item: DRELineItem; depth: number }) {
  const isGroup = item.children && item.children.length > 0;
  const paddingLeft = 16 + depth * 20;

  return (
    <>
      <tr
        className={`border-b border-stroke-soft-200 last:border-0 ${
          isGroup ? 'bg-bg-weak-50' : ''
        }`}
      >
        <td
          className={`px-4 py-2.5 ${isGroup ? 'text-label-sm' : 'text-paragraph-sm'} text-text-strong-950`}
          style={{ paddingLeft }}
        >
          {item.label}
        </td>
        <td
          className={`px-4 py-2.5 text-right ${isGroup ? 'text-label-sm' : 'text-paragraph-sm'} ${
            item.valueCents < 0
              ? 'text-state-error-base'
              : 'text-text-strong-950'
          }`}
        >
          {formatCents(item.valueCents)}
        </td>
        <td className='px-4 py-2.5 text-right text-paragraph-xs text-text-sub-600'>
          {item.percentage.toFixed(1)}%
        </td>
      </tr>
      {item.children?.map((child, i) => (
        <DRERow key={i} item={child} depth={depth + 1} />
      ))}
    </>
  );
}

function SummaryKPI({
  label,
  valueCents,
  color,
}: {
  label: string;
  valueCents: number;
  color: 'success' | 'error';
}) {
  return (
    <div className='rounded-lg border border-stroke-soft-200 bg-bg-white-0 p-4'>
      <p className='text-paragraph-xs text-text-sub-600'>{label}</p>
      <p
        className={`mt-1 text-title-h6 ${
          color === 'success'
            ? 'text-state-success-base'
            : 'text-state-error-base'
        }`}
      >
        {formatCents(valueCents)}
      </p>
    </div>
  );
}
