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
import * as Select from '@/components/ui/select';
import * as Pagination from '@/components/ui/pagination';
import { useDebounce } from '@/hooks/use-debounce';
import { formatCents, formatDate } from '@/lib/formatters';
import { useAccountsPayable } from '../hooks/use-financial';
import { PaymentStatusBadge } from './payment-status-badge';
import type { APFilters, PaymentStatus } from '../types/financial.types';

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'Todos os status' },
  { value: 'PENDING', label: 'Pendente' },
  { value: 'PARTIAL', label: 'Parcial' },
  { value: 'PAID', label: 'Pago' },
  { value: 'OVERDUE', label: 'Vencido' },
  { value: 'CANCELLED', label: 'Cancelado' },
];

export function APTable() {
  const router = useRouter();
  const [filters, setFilters] = useState<APFilters>({
    page: 1,
    limit: 20,
    search: '',
  });
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const debouncedSearch = useDebounce(searchInput, 300);
  const { data, isLoading } = useAccountsPayable(filters);

  const items = data?.data ?? [];
  const pagination = data?.meta?.pagination;

  useEffect(() => {
    setFilters((prev) => ({ ...prev, page: 1, search: debouncedSearch }));
  }, [debouncedSearch]);

  useEffect(() => {
    setFilters((prev) => ({
      ...prev,
      page: 1,
      status: (statusFilter || undefined) as PaymentStatus | undefined,
    }));
  }, [statusFilter]);

  function handlePageChange(page: number) {
    setFilters((prev) => ({ ...prev, page }));
  }

  return (
    <div className='space-y-4'>
      {/* Header */}
      <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
        <div>
          <h1 className='text-title-h5 text-text-strong-950'>
            Contas a Pagar
          </h1>
          <p className='text-paragraph-sm text-text-sub-600'>
            Gerencie os pagamentos a fornecedores e despesas.
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
                placeholder='Buscar por descrição, fornecedor...'
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </Input.Wrapper>
          </Input.Root>
        </div>
        <Select.Root value={statusFilter} onValueChange={setStatusFilter}>
          <Select.Trigger className='w-full sm:w-48'>
            <RiFilterLine className='size-4 text-text-soft-400' />
            <Select.Value placeholder='Status' />
          </Select.Trigger>
          <Select.Content>
            {STATUS_OPTIONS.map((opt) => (
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
              <Table.Head>Descrição</Table.Head>
              <Table.Head>Fornecedor</Table.Head>
              <Table.Head>Categoria</Table.Head>
              <Table.Head className='text-right'>Valor</Table.Head>
              <Table.Head className='text-right'>Pago</Table.Head>
              <Table.Head>Vencimento</Table.Head>
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
                      ? 'Nenhuma conta a pagar encontrada para esta busca.'
                      : 'Nenhuma conta a pagar registrada.'}
                  </p>
                </Table.Cell>
              </Table.Row>
            ) : (
              items.map((ap) => (
                <Table.Row key={ap.id}>
                  <Table.Cell>
                    <button
                      onClick={() =>
                        router.push(`/financeiro/contas-a-pagar/${ap.id}`)
                      }
                      className='text-left text-label-sm text-text-strong-950 transition hover:text-primary-base'
                    >
                      {ap.description}
                    </button>
                  </Table.Cell>
                  <Table.Cell>
                    <span className='text-paragraph-sm text-text-sub-600'>
                      {ap.supplier?.name ?? '—'}
                    </span>
                  </Table.Cell>
                  <Table.Cell>
                    <span className='text-paragraph-sm text-text-sub-600'>
                      {ap.category?.name ?? '—'}
                    </span>
                  </Table.Cell>
                  <Table.Cell className='text-right font-medium'>
                    {formatCents(ap.amountCents)}
                  </Table.Cell>
                  <Table.Cell className='text-right'>
                    {formatCents(ap.paidAmountCents)}
                  </Table.Cell>
                  <Table.Cell>
                    <span className='text-paragraph-sm text-text-sub-600'>
                      {formatDate(ap.dueDate)}
                    </span>
                  </Table.Cell>
                  <Table.Cell>
                    <PaymentStatusBadge status={ap.status} />
                  </Table.Cell>
                  <Table.Cell className='text-right'>
                    <Button.Root
                      asChild
                      variant='neutral'
                      mode='ghost'
                      size='xxsmall'
                    >
                      <Link href={`/financeiro/contas-a-pagar/${ap.id}`}>
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
            {pagination.total} registro{pagination.total !== 1 ? 's' : ''} no
            total
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
