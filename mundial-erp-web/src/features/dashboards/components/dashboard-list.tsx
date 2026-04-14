'use client';

import { useRouter } from 'next/navigation';
import {
  RiAddLine,
  RiDashboardLine,
  RiLockLine,
  RiGlobalLine,
} from '@remixicon/react';
import * as Button from '@/components/ui/button';

import { formatDate } from '@/lib/formatters';
import { useDashboards } from '../hooks/use-dashboards';
import type { DashboardListItem } from '../types/dashboard.types';

export function DashboardList() {
  const router = useRouter();
  const { data, isLoading } = useDashboards();

  const dashboards = data?.data ?? [];

  return (
    <div className='space-y-6'>
      {/* Header */}
      <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
        <div>
          <h1 className='text-title-h5 text-text-strong-950'>Painéis</h1>
          <p className='text-paragraph-sm text-text-sub-600'>
            Dashboards configuráveis com KPIs e gráficos.
          </p>
        </div>
        <div className='flex items-center gap-3'>
          <Button.Root
            variant='primary'
            mode='filled'
            size='small'
            onClick={() => router.push('/paineis/novo')}
          >
            <Button.Icon as={RiAddLine} />
            Novo Painel
          </Button.Root>
        </div>
      </div>

      {/* Body */}
        {/* Loading */}
        {isLoading && (
          <div className='grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3'>
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className='h-40 animate-pulse rounded-lg bg-bg-weak-50'
              />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && dashboards.length === 0 && (
          <div className='flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-stroke-soft-200 py-16'>
            <RiDashboardLine className='size-12 text-text-soft-400' />
            <div className='text-center'>
              <p className='text-label-md text-text-strong-950'>
                Nenhum painel criado
              </p>
              <p className='text-paragraph-sm text-text-sub-600'>
                Crie seu primeiro dashboard para visualizar KPIs.
              </p>
            </div>
            <Button.Root
              variant='primary'
              mode='filled'
              size='small'
              onClick={() => router.push('/paineis/novo')}
            >
              <Button.Icon as={RiAddLine} />
              Criar Painel
            </Button.Root>
          </div>
        )}

        {/* Dashboard Cards */}
        {!isLoading && dashboards.length > 0 && (
          <div className='grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3'>
            {dashboards.map((dashboard) => (
              <DashboardCard key={dashboard.id} dashboard={dashboard} />
            ))}
          </div>
        )}
    </div>
  );
}

function DashboardCard({ dashboard }: { dashboard: DashboardListItem }) {
  const router = useRouter();

  return (
    <button
      type='button'
      onClick={() => router.push(`/paineis/${dashboard.id}`)}
      className='flex flex-col gap-3 rounded-lg border border-stroke-soft-200 bg-bg-white-0 p-5 text-left transition-shadow hover:shadow-regular-xs'
    >
      <div className='flex items-start justify-between'>
        <div className='flex items-center gap-2'>
          <RiDashboardLine className='size-5 text-primary-base' />
          <h3 className='text-label-md text-text-strong-950'>
            {dashboard.name}
          </h3>
        </div>
        {dashboard.isPublic ? (
          <RiGlobalLine className='size-4 text-text-soft-400' />
        ) : (
          <RiLockLine className='size-4 text-text-soft-400' />
        )}
      </div>

      {dashboard.description && (
        <p className='line-clamp-2 text-paragraph-xs text-text-sub-600'>
          {dashboard.description}
        </p>
      )}

      <div className='mt-auto flex items-center justify-between pt-2'>
        <span className='text-paragraph-xs text-text-soft-400'>
          {dashboard.cardCount} card{dashboard.cardCount !== 1 ? 's' : ''}
        </span>
        <span className='text-paragraph-xs text-text-soft-400'>
          {formatDate(dashboard.updatedAt)}
        </span>
      </div>
    </button>
  );
}
