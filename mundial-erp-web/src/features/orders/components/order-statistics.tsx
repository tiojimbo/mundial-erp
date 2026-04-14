'use client';

import { cn } from '@/lib/cn';

type StatCardProps = {
  label: string;
  value: string;
  change?: string;
  changeLabel?: string;
  positive?: boolean;
  subtitle?: string;
};

function StatCard({
  label,
  value,
  change,
  changeLabel,
  positive,
  subtitle,
}: StatCardProps) {
  return (
    <div className='flex flex-1 flex-col gap-1'>
      <span className='text-[14px] font-medium leading-[20px] tracking-[-0.084px] text-text-sub-600'>
        {label}
      </span>
      <div className='flex items-center gap-1.5'>
        <span className='text-[24px] font-medium leading-[32px] text-text-strong-950'>
          {value}
        </span>
        {change && changeLabel && (
          <span className='text-[12px] font-medium leading-[16px]'>
            <span
              className={cn(
                positive ? 'text-success-base' : 'text-error-base',
              )}
            >
              {change}
            </span>
            <span className='text-text-sub-600'>{` ${changeLabel}`}</span>
          </span>
        )}
        {subtitle && (
          <span className='text-[12px] font-medium leading-[16px] text-text-soft-400'>
            {subtitle}
          </span>
        )}
      </div>
    </div>
  );
}

function VerticalDashedDivider() {
  return (
    <div className='flex self-stretch items-center'>
      <div className='h-14 w-px border-l border-dashed border-stroke-soft-200' />
    </div>
  );
}

type OrderStatisticsProps = {
  totalOrders?: number;
  totalOrdersChange?: string;
  totalRevenue?: string;
  totalRevenueChange?: string;
  averageOrderValue?: string;
  averageOrderValueChange?: string;
  pendingOrders?: number;
};

export function OrderStatistics({
  totalOrders = 0,
  totalOrdersChange,
  totalRevenue = 'R$ 0',
  totalRevenueChange,
  averageOrderValue = 'R$ 0',
  averageOrderValueChange,
  pendingOrders = 0,
}: OrderStatisticsProps) {
  return (
    <div className='flex items-center gap-7 border-y border-dashed border-stroke-soft-200 py-6'>
      <StatCard
        label='Total de Pedidos'
        value={totalOrders.toLocaleString('pt-BR')}
        change={totalOrdersChange}
        changeLabel='esta semana'
        positive={
          totalOrdersChange ? totalOrdersChange.startsWith('+') : undefined
        }
      />
      <VerticalDashedDivider />
      <StatCard
        label='Receita Total'
        value={totalRevenue}
        change={totalRevenueChange}
        changeLabel='vs semana passada'
        positive={
          totalRevenueChange ? totalRevenueChange.startsWith('+') : undefined
        }
      />
      <VerticalDashedDivider />
      <StatCard
        label='Ticket Medio'
        value={averageOrderValue}
        change={averageOrderValueChange}
        changeLabel='esta semana'
        positive={
          averageOrderValueChange
            ? averageOrderValueChange.startsWith('+')
            : undefined
        }
      />
      <VerticalDashedDivider />
      <StatCard
        label='Pedidos Pendentes'
        value={String(pendingOrders)}
        subtitle='Requer atencao'
      />
    </div>
  );
}
