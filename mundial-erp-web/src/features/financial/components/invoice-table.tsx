'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  RiSearchLine,
  RiArrowLeftSLine,
  RiArrowRightSLine,
  RiEyeLine,
  RiFilterLine,
} from '@remixicon/react';
import * as Table from '@/components/ui/table';
import * as Input from '@/components/ui/input';
import * as Button from '@/components/ui/button';
import * as Badge from '@/components/ui/badge';
import * as Select from '@/components/ui/select';
import * as Pagination from '@/components/ui/pagination';

import { useDebounce } from '@/hooks/use-debounce';
import { formatCents, formatDate } from '@/lib/formatters';
import { useInvoices } from '../hooks/use-financial';
import type { InvoiceFilters, InvoiceDirection } from '../types/financial.types';
import { INVOICE_DIRECTION_LABELS } from '../types/financial.types';

type BadgeColor = React.ComponentProps<typeof Badge.Root>['color'];

const DIRECTION_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'Todas as direções' },
  { value: 'INBOUND', label: 'Entrada' },
  { value: 'OUTBOUND', label: 'Saída' },
];

const DIRECTION_COLOR: Record<InvoiceDirection, BadgeColor> = {
  INBOUND: 'blue',
  OUTBOUND: 'green',
};

export function InvoiceTable() {
  const router = useRouter();
  const [filters, setFilters] = useState<InvoiceFilters>({
    page: 1,
    limit: 20,
    search: '',
  });
  const [searchInput, setSearchInput] = useState('');
  const [directionFilter, setDirectionFilter] = useState('');
  const debouncedSearch = useDebounce(searchInput, 300);
  const { data, isLoading } = useInvoices(filters);

  const items = data?.data ?? [];
  const pagination = data?.meta?.pagination;

  useEffect(() => {
    setFilters((prev) => ({ ...prev, page: 1, search: debouncedSearch }));
  }, [debouncedSearch]);

  useEffect(() => {
    setFilters((prev) => ({
      ...prev,
      page: 1,
      direction: (directionFilter || undefined) as InvoiceDirection | undefined,
    }));
  }, [directionFilter]);

  function handlePageChange(page: number) {
    setFilters((prev) => ({ ...prev, page }));
  }

  return (
    <div className='space-y-4'>
      {/* Header */}
      <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
        <div>
          <h1 className='text-title-h5 text-text-strong-950'>Notas Fiscais</h1>
          <p className='text-paragraph-sm text-text-sub-600'>
            Visualize notas fiscais emitidas e recebidas.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className='flex flex-col gap-3 sm:flex-row'>
        <div className='flex-1'>
          <Input.Root size='medium'>
            <Input.Wrapper>
              <Input.Icon as={RiSearchLine} />
              <Input.Input
                placeholder='Buscar por número, chave de acesso, cliente...'
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </Input.Wrapper>
          </Input.Root>
        </div>
        <Select.Root value={directionFilter} onValueChange={setDirectionFilter}>
          <Select.Trigger className='w-full sm:w-48'>
            <RiFilterLine className='size-4 text-text-soft-400' />
            <Select.Value placeholder='Direção' />
          </Select.Trigger>
          <Select.Content>
            {DIRECTION_OPTIONS.map((opt) => (
              <Select.Item key={opt.value} value={opt.value}>
                {opt.label}
              </Select.Item>
            ))}
          </Select.Content>
        </Select.Root>
      </div>

      {/* Table */}
        <Table.Root>
          <Table.Header>
            <Table.Row>
              <Table.Head>Número</Table.Head>
              <Table.Head>Direção</Table.Head>
              <Table.Head>Cliente</Table.Head>
              <Table.Head>Pedido</Table.Head>
              <Table.Head className='text-right'>Valor</Table.Head>
              <Table.Head>Emissão</Table.Head>
              <Table.Head>Status</Table.Head>
              <Table.Head className='text-right'>Ações</Table.Head>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <Table.Row key={i}>
                  {Array.from({ length: 8 }).map((__, j) => (
                    <Table.Cell key={j}>
                      <div className='h-4 w-24 animate-pulse rounded bg-bg-weak-50' />
                    </Table.Cell>
                  ))}
                </Table.Row>
              ))
            ) : items.length === 0 ? (
              <Table.Row>
                <Table.Cell colSpan={8} className='text-center'>
                  <p className='py-8 text-paragraph-sm text-text-soft-400'>
                    {filters.search
                      ? 'Nenhuma nota fiscal encontrada para esta busca.'
                      : 'Nenhuma nota fiscal registrada.'}
                  </p>
                </Table.Cell>
              </Table.Row>
            ) : (
              items.map((inv) => (
                <Table.Row key={inv.id}>
                  <Table.Cell>
                    <button
                      onClick={() =>
                        router.push(`/financeiro/notas-fiscais/${inv.id}`)
                      }
                      className='text-left text-label-sm text-text-strong-950 transition hover:text-primary-base'
                    >
                      {inv.invoiceNumber}
                    </button>
                  </Table.Cell>
                  <Table.Cell>
                    <Badge.Root
                      color={DIRECTION_COLOR[inv.direction]}
                      variant='lighter'
                      size='small'
                    >
                      {INVOICE_DIRECTION_LABELS[inv.direction]}
                    </Badge.Root>
                  </Table.Cell>
                  <Table.Cell>
                    <span className='text-paragraph-sm text-text-sub-600'>
                      {inv.client?.name ?? '—'}
                    </span>
                  </Table.Cell>
                  <Table.Cell>
                    {inv.order ? (
                      <Link
                        href={`/comercial/pedidos/${inv.orderId}`}
                        className='text-paragraph-sm text-primary-base hover:underline'
                      >
                        #{inv.order.orderNumber}
                      </Link>
                    ) : (
                      <span className='text-paragraph-sm text-text-soft-400'>
                        —
                      </span>
                    )}
                  </Table.Cell>
                  <Table.Cell className='text-right font-medium'>
                    {formatCents(inv.totalCents)}
                  </Table.Cell>
                  <Table.Cell>
                    <span className='text-paragraph-sm text-text-sub-600'>
                      {formatDate(inv.issuedAt)}
                    </span>
                  </Table.Cell>
                  <Table.Cell>
                    {inv.cancelledAt ? (
                      <Badge.Root color='red' variant='lighter' size='small'>
                        <Badge.Dot />
                        Cancelada
                      </Badge.Root>
                    ) : (
                      <Badge.Root color='green' variant='lighter' size='small'>
                        <Badge.Dot />
                        Ativa
                      </Badge.Root>
                    )}
                  </Table.Cell>
                  <Table.Cell className='text-right'>
                    <Button.Root
                      asChild
                      variant='neutral'
                      mode='ghost'
                      size='xxsmall'
                    >
                      <Link href={`/financeiro/notas-fiscais/${inv.id}`}>
                        <Button.Icon as={RiEyeLine} />
                      </Link>
                    </Button.Root>
                  </Table.Cell>
                </Table.Row>
              ))
            )}
          </Table.Body>
        </Table.Root>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className='flex items-center justify-between'>
          <p className='text-paragraph-sm text-text-sub-600'>
            {pagination.total} nota{pagination.total !== 1 ? 's' : ''} no total
          </p>
          <Pagination.Root variant='basic'>
            <Pagination.NavButton
              disabled={pagination.page <= 1}
              onClick={() => handlePageChange(pagination.page - 1)}
            >
              <Pagination.NavIcon as={RiArrowLeftSLine} />
            </Pagination.NavButton>
            {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
              .filter((p) => {
                const current = pagination.page;
                return (
                  p === 1 ||
                  p === pagination.totalPages ||
                  Math.abs(p - current) <= 1
                );
              })
              .map((p, idx, arr) => {
                const prev = arr[idx - 1];
                const showEllipsis = prev !== undefined && p - prev > 1;
                return (
                  <span key={p} className='contents'>
                    {showEllipsis && (
                      <Pagination.Item disabled>...</Pagination.Item>
                    )}
                    <Pagination.Item
                      current={p === pagination.page}
                      onClick={() => handlePageChange(p)}
                    >
                      {p}
                    </Pagination.Item>
                  </span>
                );
              })}
            <Pagination.NavButton
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => handlePageChange(pagination.page + 1)}
            >
              <Pagination.NavIcon as={RiArrowRightSLine} />
            </Pagination.NavButton>
          </Pagination.Root>
        </div>
      )}
    </div>
  );
}
