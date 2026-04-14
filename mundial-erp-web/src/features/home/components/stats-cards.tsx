'use client';

import {
  RiCheckboxCircleLine,
  RiShoppingBag3Line,
  RiExchangeLine,
} from '@remixicon/react';
import type { HomeStats } from '../types/home.types';

type StatsCardsProps = {
  stats: HomeStats | undefined;
  isLoading: boolean;
};

const cards = [
  {
    key: 'pendingActivities' as const,
    label: 'Atividades Pendentes',
    icon: RiCheckboxCircleLine,
    color: 'text-primary-base',
    bgColor: 'bg-primary-alpha-10',
  },
  {
    key: 'inProgressOrders' as const,
    label: 'Pedidos em Andamento',
    icon: RiShoppingBag3Line,
    color: 'text-warning-base',
    bgColor: 'bg-warning-lighter',
  },
  {
    key: 'pendingHandoffs' as const,
    label: 'Handoffs Pendentes',
    icon: RiExchangeLine,
    color: 'text-information-base',
    bgColor: 'bg-information-lighter',
  },
];

export function StatsCards({ stats, isLoading }: StatsCardsProps) {
  return (
    <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
      {cards.map((card) => (
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
            <p className='text-paragraph-sm text-text-sub-600'>{card.label}</p>
            <p className='mt-0.5 text-title-h5 text-text-strong-950'>
              {isLoading ? (
                <span className='inline-block h-7 w-8 animate-pulse rounded bg-bg-weak-50' />
              ) : (
                (stats?.[card.key] ?? 0)
              )}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
