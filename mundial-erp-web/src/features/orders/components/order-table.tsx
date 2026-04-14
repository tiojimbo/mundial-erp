'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  RiSearchLine,
  RiArrowDownSLine,
  RiFilterLine,
  RiShareForwardBoxLine,
  RiMoreFill,
  RiEyeLine,
  RiFileTextLine,
  RiAddLine,
  RiArrowLeftDoubleLine,
  RiArrowLeftSLine,
  RiArrowRightSLine,
  RiArrowRightDoubleLine,
  RiExpandUpDownLine,
  RiCalendarLine,
} from '@remixicon/react';
import * as Table from '@/components/ui/table';
import * as Dropdown from '@/components/ui/dropdown';
import * as Pagination from '@/components/ui/pagination';
import * as Select from '@/components/ui/select';
import * as ButtonGroup from '@/components/ui/button-group';
import * as Checkbox from '@/components/ui/checkbox';

import { useDebounce } from '@/hooks/use-debounce';
import { OrderStatusBadge } from './order-status-badge';
import { OrderStatistics } from './order-statistics';
import { useOrders } from '../hooks/use-orders';
import { orderService } from '../services/order.service';
import { formatCents, formatDate } from '@/lib/formatters';
import type { OrderStatus, OrderFilters } from '../types/order.types';

const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;

const STATUS_OPTIONS: { label: string; value: OrderStatus | 'ALL' }[] = [
  { label: 'Todos os status', value: 'ALL' },
  { label: 'Em Orcamento', value: 'EM_ORCAMENTO' },
  { label: 'Faturar', value: 'FATURAR' },
  { label: 'Faturado', value: 'FATURADO' },
  { label: 'Produzir', value: 'PRODUZIR' },
  { label: 'Em Producao', value: 'EM_PRODUCAO' },
  { label: 'Produzido', value: 'PRODUZIDO' },
  { label: 'Entregue', value: 'ENTREGUE' },
  { label: 'Cancelado', value: 'CANCELADO' },
];

export function OrderTable() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState<number>(20);
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'ALL'>('ALL');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const debouncedSearch = useDebounce(search, 300);

  const filters: OrderFilters = {
    page,
    limit,
    search: debouncedSearch || undefined,
    status: statusFilter === 'ALL' ? undefined : [statusFilter],
  };

  const { data, isLoading } = useOrders(filters);
  const orders = data?.data ?? [];
  const pagination = data?.meta?.pagination;
  const totalPages = pagination?.totalPages ?? 1;

  const allSelected =
    orders.length > 0 && orders.every((o) => selectedIds.has(o.id));
  const someSelected =
    orders.some((o) => selectedIds.has(o.id)) && !allSelected;

  function handleSelectAll() {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(orders.map((o) => o.id)));
    }
  }

  function handleSelectOne(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  return (
    <div className='flex flex-col gap-6'>
      {/* Header */}
      <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
        <div>
          <h1 className='text-lg font-medium text-text-strong-950'>Pedidos</h1>
        </div>
        <div className='flex items-center gap-3'>
          <Link
            href='/comercial/pedidos/novo'
            className='inline-flex size-10 items-center justify-center rounded-[10px] border border-stroke-soft-200 bg-bg-white-0 text-text-sub-600 shadow-regular-xs transition hover:bg-bg-weak-50'
          >
            <RiAddLine className='size-5' />
          </Link>
        </div>
      </div>

      {/* Statistics */}
      <div className='shrink-0 px-5 pb-3'>
        <OrderStatistics
          totalOrders={pagination?.total ?? 0}
          totalRevenue={
            orders.length > 0
              ? formatCents(
                  orders.reduce((sum, o) => sum + o.totalCents, 0),
                )
              : 'R$ 0'
          }
          averageOrderValue={
            orders.length > 0
              ? formatCents(
                  Math.round(
                    orders.reduce((sum, o) => sum + o.totalCents, 0) /
                      orders.length,
                  ),
                )
              : 'R$ 0'
          }
          pendingOrders={0}
        />
      </div>

      {/* Toolbar */}
      <div className='flex flex-col gap-3 sm:flex-row'>
        {/* Search */}
        <div className='flex w-[352px] items-center gap-2 rounded-[10px] border border-stroke-soft-200 bg-bg-white-0 px-2.5 py-2 shadow-regular-xs'>
          <RiSearchLine className='size-5 shrink-0 text-text-soft-400' />
          <input
            type='text'
            placeholder='Buscar pedidos...'
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className='w-full bg-transparent text-sm text-text-strong-950 outline-none placeholder:text-text-soft-400'
          />
        </div>

        {/* Date Range Button Group */}
        <ButtonGroup.Root size='small'>
          <ButtonGroup.Item>
            Ultimos 7 dias
            <ButtonGroup.Icon as={RiArrowDownSLine} />
          </ButtonGroup.Item>
          <ButtonGroup.Item>
            <ButtonGroup.Icon as={RiCalendarLine} />
            {new Date().toLocaleDateString('pt-BR', {
              day: '2-digit',
              month: 'short',
            })}{' '}
            -{' '}
            {new Date(Date.now() + 7 * 86400000).toLocaleDateString('pt-BR', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            })}
          </ButtonGroup.Item>
        </ButtonGroup.Root>

        {/* Spacer */}
        <div className='flex-1' />

        {/* Status dropdown */}
        <Select.Root
          value={statusFilter}
          onValueChange={(val) => {
            setStatusFilter(val as OrderStatus | 'ALL');
            setPage(1);
          }}
        >
          <Select.Trigger className='h-9 w-auto rounded-[10px] border border-stroke-soft-200 bg-bg-white-0 px-2 shadow-regular-xs'>
            <Select.Value placeholder='Todos os status' />
          </Select.Trigger>
          <Select.Content>
            {STATUS_OPTIONS.map((opt) => (
              <Select.Item key={opt.value} value={opt.value}>
                {opt.label}
              </Select.Item>
            ))}
          </Select.Content>
        </Select.Root>

        {/* Filtro */}
        <button className='flex items-center gap-1 rounded-[10px] border border-stroke-soft-200 bg-bg-white-0 px-2 py-2 shadow-regular-xs'>
          <RiFilterLine className='size-5 text-text-sub-600' />
          <span className='px-1 text-sm font-medium text-text-sub-600'>
            Filtro
          </span>
        </button>

        {/* Exportar */}
        <button className='flex items-center gap-1 rounded-[10px] border border-stroke-soft-200 bg-bg-white-0 px-2 py-2 shadow-regular-xs'>
          <RiShareForwardBoxLine className='size-5 text-text-sub-600' />
          <span className='px-1 text-sm font-medium text-text-sub-600'>
            Exportar
          </span>
        </button>
      </div>

      {/* Body */}
        <Table.Root>
          <Table.Header>
            <Table.Row>
              <Table.Head className='w-[164px]'>
                <span className='flex items-center gap-2.5'>
                  <Checkbox.Root
                    checked={
                      allSelected
                        ? true
                        : someSelected
                          ? 'indeterminate'
                          : false
                    }
                    onCheckedChange={handleSelectAll}
                  />
                  <span className='flex items-center gap-0.5'>
                    ID
                    <RiExpandUpDownLine className='size-5 text-text-soft-400' />
                  </span>
                </span>
              </Table.Head>
              <Table.Head className='w-[138px]'>
                <span className='flex items-center gap-0.5'>
                  Data
                  <RiExpandUpDownLine className='size-5 text-text-soft-400' />
                </span>
              </Table.Head>
              <Table.Head className='w-[118px]'>
                <span className='flex items-center gap-0.5'>
                  Status
                  <RiExpandUpDownLine className='size-5 text-text-soft-400' />
                </span>
              </Table.Head>
              <Table.Head className='w-[188px]'>
                <span className='flex items-center gap-0.5'>
                  Responsavel
                  <RiExpandUpDownLine className='size-5 text-text-soft-400' />
                </span>
              </Table.Head>
              <Table.Head>
                <span className='flex items-center gap-0.5'>
                  Produto
                  <RiExpandUpDownLine className='size-5 text-text-soft-400' />
                </span>
              </Table.Head>
              <Table.Head className='w-[124px]'>
                <span className='flex items-center gap-0.5'>
                  Valor
                  <RiExpandUpDownLine className='size-5 text-text-soft-400' />
                </span>
              </Table.Head>
              <Table.Head className='w-16' />
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {/* Loading skeleton */}
            {isLoading &&
              Array.from({ length: 5 }).map((_, i) => (
                <Table.Row key={i}>
                  <Table.Cell colSpan={7}>
                    <div className='h-5 animate-pulse rounded bg-bg-weak-50' />
                  </Table.Cell>
                </Table.Row>
              ))}

            {/* Empty state */}
            {!isLoading && orders.length === 0 && (
              <Table.Row>
                <Table.Cell
                  colSpan={7}
                  className='text-center text-text-soft-400'
                >
                  Nenhum pedido encontrado
                </Table.Cell>
              </Table.Row>
            )}

            {/* Data rows with dividers */}
            {!isLoading &&
              orders.map((order, idx) => (
                <span key={order.id} className='contents'>
                  <Table.Row>
                    {/* Checkbox + ID */}
                    <Table.Cell>
                      <div className='flex items-center gap-3'>
                        <Checkbox.Root
                          checked={selectedIds.has(order.id)}
                          onCheckedChange={() => handleSelectOne(order.id)}
                        />
                        <Link
                          href={`/comercial/pedidos/${order.id}`}
                          className='truncate text-sm text-text-strong-950 hover:underline'
                        >
                          #{order.orderNumber}
                        </Link>
                      </div>
                    </Table.Cell>

                    {/* Data */}
                    <Table.Cell>
                      <span className='text-sm text-text-strong-950'>
                        {formatDate(order.createdAt)}
                      </span>
                    </Table.Cell>

                    {/* Status */}
                    <Table.Cell>
                      <OrderStatusBadge status={order.status} />
                    </Table.Cell>

                    {/* Responsavel */}
                    <Table.Cell>
                      <div className='flex items-center gap-3'>
                        <div className='flex size-6 shrink-0 items-center justify-center rounded-full bg-yellow-200 text-[10px] font-medium text-text-sub-600'>
                          {(order.createdByUser?.name ?? '?')
                            .charAt(0)
                            .toUpperCase()}
                        </div>
                        <span className='truncate text-sm text-text-strong-950'>
                          {order.createdByUser?.name ?? '\u2014'}
                        </span>
                      </div>
                    </Table.Cell>

                    {/* Produto (titulo do pedido) */}
                    <Table.Cell>
                      <span className='truncate text-sm text-text-strong-950'>
                        {order.title || '\u2014'}
                      </span>
                    </Table.Cell>

                    {/* Valor */}
                    <Table.Cell>
                      <span className='text-sm text-text-strong-950'>
                        {formatCents(order.totalCents)}
                      </span>
                    </Table.Cell>

                    {/* Actions */}
                    <Table.Cell className='text-center'>
                      <Dropdown.Root>
                        <Dropdown.Trigger asChild>
                          <button className='inline-flex items-center justify-center rounded-md p-0.5 text-text-sub-600 hover:bg-bg-weak-50'>
                            <RiMoreFill className='size-5' />
                          </button>
                        </Dropdown.Trigger>
                        <Dropdown.Content align='end' sideOffset={4}>
                          <Dropdown.Item asChild>
                            <Link href={`/comercial/pedidos/${order.id}`}>
                              <Dropdown.ItemIcon as={RiEyeLine} />
                              Ver dossie
                            </Link>
                          </Dropdown.Item>
                          <Dropdown.Item
                            onSelect={() => {
                              const url = orderService.getPdfUrl(order.id);
                              window.open(url, '_blank');
                            }}
                          >
                            <Dropdown.ItemIcon as={RiFileTextLine} />
                            Imprimir Proposta
                          </Dropdown.Item>
                        </Dropdown.Content>
                      </Dropdown.Root>
                    </Table.Cell>
                  </Table.Row>

                  {/* Content Divider between rows */}
                  {idx < orders.length - 1 && (
                    <Table.RowDivider key={`div-${order.id}`} />
                  )}
                </span>
              ))}
          </Table.Body>
        </Table.Root>

      {/* Footer / Pagination */}
      {totalPages > 1 && (
        <div className='flex items-center justify-between'>
          {/* Left: Page info */}
          <span className='text-sm text-text-sub-600'>
            Pagina {page} de {totalPages}
          </span>

          {/* Center: Page navigation */}
          <Pagination.Root variant='basic'>
            <Pagination.NavButton
              disabled={page <= 1}
              onClick={() => setPage(1)}
            >
              <Pagination.NavIcon as={RiArrowLeftDoubleLine} />
            </Pagination.NavButton>

            <Pagination.NavButton
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              <Pagination.NavIcon as={RiArrowLeftSLine} />
            </Pagination.NavButton>

            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(
                (p) =>
                  p === 1 ||
                  p === totalPages ||
                  Math.abs(p - page) <= 1,
              )
              .map((p, idx, arr) => {
                const prev = arr[idx - 1];
                return (
                  <span key={p} className='contents'>
                    {prev && p - prev > 1 && (
                      <Pagination.Item disabled>...</Pagination.Item>
                    )}
                    <Pagination.Item
                      current={p === page}
                      onClick={() => setPage(p)}
                    >
                      {p}
                    </Pagination.Item>
                  </span>
                );
              })}

            <Pagination.NavButton
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
            >
              <Pagination.NavIcon as={RiArrowRightSLine} />
            </Pagination.NavButton>

            <Pagination.NavButton
              disabled={page >= totalPages}
              onClick={() => setPage(totalPages)}
            >
              <Pagination.NavIcon as={RiArrowRightDoubleLine} />
            </Pagination.NavButton>
          </Pagination.Root>

          {/* Right: Items per page */}
          <Select.Root
            value={String(limit)}
            onValueChange={(val) => {
              setLimit(Number(val));
              setPage(1);
            }}
          >
            <Select.Trigger className='w-auto'>
              <Select.Value />
            </Select.Trigger>
            <Select.Content>
              {PAGE_SIZE_OPTIONS.map((n) => (
                <Select.Item key={n} value={String(n)}>
                  {n} / pagina
                </Select.Item>
              ))}
            </Select.Content>
          </Select.Root>
        </div>
      )}
    </div>
  );
}
