'use client';

import { useRouter } from 'next/navigation';
import {
  RiBarChartBoxLine,
  RiLineChartLine,
  RiMoneyDollarCircleLine,
  RiArrowRightSLine,
} from '@remixicon/react';

const REPORTS = [
  {
    title: 'DRE',
    description: 'Demonstrativo de Resultados do Exercício — receitas, despesas e resultado líquido.',
    href: '/relatorios/dre',
    icon: RiBarChartBoxLine,
    color: 'text-primary-base',
  },
  {
    title: 'Relatório de Vendas',
    description: 'Vendas por período, produto e cliente com análise de ticket médio.',
    href: '/relatorios/vendas',
    icon: RiLineChartLine,
    color: 'text-state-success-base',
  },
  {
    title: 'Fluxo de Caixa',
    description: 'Entradas, saídas e saldo acumulado dia a dia.',
    href: '/relatorios/fluxo-caixa',
    icon: RiMoneyDollarCircleLine,
    color: 'text-state-warning-base',
  },
] as const;

export function ReportHub() {
  const router = useRouter();

  return (
    <div className='space-y-6'>
      <div>
        <h1 className='text-title-h5 text-text-strong-950'>Relatórios</h1>
        <p className='text-paragraph-sm text-text-sub-600'>
          Análises financeiras e operacionais.
        </p>
      </div>

      <div className='grid grid-cols-1 gap-4 md:grid-cols-3'>
        {REPORTS.map((report) => (
          <button
            key={report.href}
            type='button'
            onClick={() => router.push(report.href)}
            className='group flex flex-col gap-3 rounded-lg border border-stroke-soft-200 bg-bg-white-0 p-5 text-left transition-shadow hover:shadow-regular-xs'
          >
            <div className='flex items-center justify-between'>
              <report.icon className={`size-6 ${report.color}`} />
              <RiArrowRightSLine className='size-5 text-text-soft-400 transition-transform group-hover:translate-x-0.5' />
            </div>
            <div>
              <h3 className='text-label-md text-text-strong-950'>
                {report.title}
              </h3>
              <p className='mt-1 text-paragraph-xs text-text-sub-600'>
                {report.description}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
