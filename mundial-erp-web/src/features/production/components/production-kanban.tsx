'use client';

import { useState } from 'react';
import Link from 'next/link';
import * as Badge from '@/components/ui/badge';
import * as TabMenu from '@/components/ui/tab-menu-horizontal';

import { useDebounce } from '@/hooks/use-debounce';
import { useProductionOrders, useSeparationOrders } from '../hooks/use-production';
import { POStatusBadge, SOStatusBadge } from './po-status-badge';
import { formatDate } from '@/lib/formatters';
import type {
  ProductionOrderSummary,
  SeparationOrderSummary,
} from '../types/production.types';

// ===== Kanban Column Config =====

type KanbanColumn = {
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  label: string;
  icon: string;
  color: string;
};

const KANBAN_COLUMNS: KanbanColumn[] = [
  { status: 'PENDING', label: 'Pendente', icon: 'ri-time-line', color: 'border-t-orange-400' },
  { status: 'IN_PROGRESS', label: 'Em Producao', icon: 'ri-hammer-line', color: 'border-t-purple-400' },
  { status: 'COMPLETED', label: 'Concluida', icon: 'ri-checkbox-circle-line', color: 'border-t-green-400' },
];

const COLUMN_LIMIT = 20;

// ===== Kanban Card =====

function ProductionKanbanCard({ po }: { po: ProductionOrderSummary }) {
  return (
    <Link
      href={`/producao/ordens/${po.id}`}
      className='block rounded-lg border border-stroke-soft-200 bg-bg-white-0 p-3 shadow-sm transition-shadow hover:shadow-md'
    >
      <div className='mb-2 flex items-center justify-between'>
        <span className='text-label-sm font-medium text-primary-base'>
          {po.code}
        </span>
        <POStatusBadge status={po.status} />
      </div>

      <p className='mb-1 truncate text-paragraph-sm text-text-strong-950'>
        Pedido #{po.order?.orderNumber ?? '-'}
      </p>
      <p className='truncate text-paragraph-xs text-text-sub-600'>
        {po.order?.client?.name ?? 'Cliente nao informado'}
      </p>

      <div className='mt-2 flex items-center justify-between text-paragraph-xs text-text-soft-400'>
        <span>
          <i className='ri-box-3-line mr-1' />
          {po.itemCount ?? 0} {po.itemCount === 1 ? 'item' : 'itens'}
        </span>
        {po.scheduledDate && (
          <span>
            <i className='ri-calendar-line mr-1' />
            {formatDate(po.scheduledDate)}
          </span>
        )}
      </div>

      {po.assignedUser && (
        <div className='mt-2 flex items-center gap-1 text-paragraph-xs text-text-sub-600'>
          <i className='ri-user-line' />
          {po.assignedUser.name}
        </div>
      )}
    </Link>
  );
}

// ===== Kanban Column Component =====

function KanbanColumnComponent({
  column,
  orders,
  isLoading,
  total,
}: {
  column: KanbanColumn;
  orders: ProductionOrderSummary[];
  isLoading: boolean;
  total: number;
}) {
  return (
    <div className='flex min-w-[300px] flex-1 flex-col'>
      <div
        className={`mb-3 flex items-center gap-2 rounded-t-lg border-t-4 ${column.color} bg-bg-weak-50 px-3 py-2`}
      >
        <i className={`${column.icon} text-lg`} />
        <span className='text-label-sm text-text-strong-950'>{column.label}</span>
        <Badge.Root color='gray' variant='lighter' size='small'>
          {total}
        </Badge.Root>
      </div>

      <div className='flex flex-col gap-2'>
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className='h-28 animate-pulse rounded-lg bg-bg-weak-50' />
          ))
        ) : orders.length === 0 ? (
          <div className='flex items-center justify-center rounded-lg border border-dashed border-stroke-soft-200 px-3 py-8 text-paragraph-sm text-text-soft-400'>
            Nenhuma OP
          </div>
        ) : (
          orders.map((po) => <ProductionKanbanCard key={po.id} po={po} />)
        )}
      </div>
    </div>
  );
}

// ===== Separation Orders List =====

function SeparationOrdersList() {
  const { data, isLoading } = useSeparationOrders({ limit: 50 });
  const orders = data?.data ?? [];

  if (isLoading) {
    return (
      <div className='flex flex-col gap-3'>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className='h-16 animate-pulse rounded-lg bg-bg-weak-50' />
        ))}
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className='flex flex-col items-center justify-center gap-2 py-8 text-text-soft-400'>
        <i className='ri-inbox-unarchive-line text-3xl' />
        <p className='text-paragraph-sm'>Nenhuma ordem de separacao</p>
      </div>
    );
  }

  return (
    <div className='flex flex-col gap-2'>
      {orders.map((so) => (
        <SeparationCard key={so.id} so={so} />
      ))}
    </div>
  );
}

function SeparationCard({ so }: { so: SeparationOrderSummary }) {
  return (
    <div className='flex items-center justify-between rounded-lg border border-stroke-soft-200 bg-bg-white-0 p-3'>
      <div className='flex items-center gap-3'>
        <div>
          <div className='flex items-center gap-2'>
            <span className='text-label-sm font-medium'>{so.code}</span>
            <SOStatusBadge status={so.status} />
          </div>
          <p className='text-paragraph-xs text-text-sub-600'>
            Pedido #{so.order?.orderNumber ?? '-'} · {so.order?.client?.name ?? '-'}
          </p>
        </div>
      </div>
      <div className='flex items-center gap-2 text-paragraph-xs text-text-soft-400'>
        <span>{so.itemCount ?? 0} itens</span>
        {so.assignedUser && <span>· {so.assignedUser.name}</span>}
      </div>
    </div>
  );
}

// ===== Main Component =====

export function ProductionKanban() {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);

  const searchParam = debouncedSearch || undefined;

  // 3 parallel queries — one per kanban column, each with its own limit
  const pendingQuery = useProductionOrders({
    status: 'PENDING',
    limit: COLUMN_LIMIT,
    search: searchParam,
  });
  const inProgressQuery = useProductionOrders({
    status: 'IN_PROGRESS',
    limit: COLUMN_LIMIT,
    search: searchParam,
  });
  const completedQuery = useProductionOrders({
    status: 'COMPLETED',
    limit: COLUMN_LIMIT,
    search: searchParam,
  });

  const columns = [
    {
      column: KANBAN_COLUMNS[0],
      orders: pendingQuery.data?.data ?? [],
      isLoading: pendingQuery.isLoading,
      total: pendingQuery.data?.meta?.pagination?.total ?? 0,
    },
    {
      column: KANBAN_COLUMNS[1],
      orders: inProgressQuery.data?.data ?? [],
      isLoading: inProgressQuery.isLoading,
      total: inProgressQuery.data?.meta?.pagination?.total ?? 0,
    },
    {
      column: KANBAN_COLUMNS[2],
      orders: completedQuery.data?.data ?? [],
      isLoading: completedQuery.isLoading,
      total: completedQuery.data?.meta?.pagination?.total ?? 0,
    },
  ];

  return (
    <div className='flex flex-col gap-5'>
      <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
        <div>
          <h1 className='text-title-h5 text-text-strong-950'>Producao</h1>
          <p className='text-paragraph-sm text-text-sub-600'>
            Ordens de producao e separacao
          </p>
        </div>
      </div>

      <TabMenu.Root defaultValue='producao'>
        <TabMenu.List>
            <TabMenu.Trigger value='producao'>
              <TabMenu.Icon as='i' className='ri-hammer-line' />
              Ordens de Producao
            </TabMenu.Trigger>
            <TabMenu.Trigger value='separacao'>
              <TabMenu.Icon as='i' className='ri-inbox-unarchive-line' />
              Ordens de Separacao
            </TabMenu.Trigger>
          </TabMenu.List>

          <TabMenu.Content value='producao' className='pt-4'>
            {/* Search */}
            <div className='mb-4 flex items-center gap-3'>
              <div className='relative flex-1'>
                <i className='ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-text-soft-400' />
                <input
                  type='text'
                  placeholder='Buscar por codigo, pedido ou cliente...'
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className='w-full rounded-lg border border-stroke-soft-200 py-2 pl-9 pr-3 text-paragraph-sm focus:border-primary-base focus:outline-none'
                />
              </div>
            </div>

            {/* Kanban Board */}
            <div className='flex gap-4 overflow-x-auto pb-4'>
              {columns.map(({ column, orders, isLoading, total }) => (
                <KanbanColumnComponent
                  key={column.status}
                  column={column}
                  orders={orders}
                  isLoading={isLoading}
                  total={total}
                />
              ))}
            </div>
          </TabMenu.Content>

          <TabMenu.Content value='separacao' className='pt-4'>
            <SeparationOrdersList />
          </TabMenu.Content>
      </TabMenu.Root>
    </div>
  );
}
