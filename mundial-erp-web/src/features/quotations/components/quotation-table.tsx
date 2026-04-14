'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  RiSearchLine,
  RiAddLine,
  RiArrowLeftSLine,
  RiArrowRightSLine,
  RiEyeLine,
} from '@remixicon/react';
import * as Table from '@/components/ui/table';
import * as Button from '@/components/ui/button';
import * as Input from '@/components/ui/input';
import * as Pagination from '@/components/ui/pagination';

import { useDebounce } from '@/hooks/use-debounce';
import { formatCents, formatDate } from '@/lib/formatters';
import { QuotationStatusBadge } from './quotation-status-badge';
import { useQuotations } from '../hooks/use-quotations';
import type { QuotationStatus, QuotationFilters } from '../types/quotation.types';

const STATUS_TABS: { label: string; filter: QuotationStatus[] | undefined }[] = [
  { label: 'Todas', filter: undefined },
  { label: 'Rascunho', filter: ['DRAFT'] },
  { label: 'Enviadas', filter: ['SENT'] },
  { label: 'Recebidas', filter: ['RECEIVED'] },
  { label: 'Selecionadas', filter: ['SELECTED'] },
  { label: 'Rejeitadas', filter: ['REJECTED'] },
];

export function QuotationTable() {
  const [activeTab, setActiveTab] = useState(0);
  const [searchInput, setSearchInput] = useState('');
  const [filters, setFilters] = useState<QuotationFilters>({
    page: 1,
    limit: 20,
  });
  const debouncedSearch = useDebounce(searchInput, 300);

  useEffect(() => {
    setFilters((prev) => ({
      ...prev,
      page: 1,
      search: debouncedSearch || undefined,
    }));
  }, [debouncedSearch]);

  useEffect(() => {
    setFilters((prev) => ({
      ...prev,
      page: 1,
      status: STATUS_TABS[activeTab].filter,
    }));
  }, [activeTab]);

  const { data, isLoading } = useQuotations(filters);
  const quotations = data?.data ?? [];
  const pagination = data?.meta?.pagination;

  function handlePageChange(page: number) {
    setFilters((prev) => ({ ...prev, page }));
  }

  return (
    <div className='space-y-4'>
      {/* Header */}
      <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
        <div>
          <h1 className='text-title-h5 text-text-strong-950'>Cotações</h1>
          <p className='text-paragraph-sm text-text-sub-600'>
            Gerencie cotações de compra com fornecedores.
          </p>
        </div>
        <div className='flex items-center gap-3'>
          <Button.Root asChild variant='primary' mode='filled' size='medium'>
            <Link href='/compras/cotacoes/nova'>
              <Button.Icon as={RiAddLine} />
              Nova Cotação
            </Link>
          </Button.Root>
        </div>
      </div>

      {/* Status tabs + Search */}
      <div className='border-b border-stroke-soft-200'>
        <div className='flex flex-col gap-3 sm:flex-row'>
        <div className='flex items-center gap-1'>
          {STATUS_TABS.map((tab, idx) => (
            <button
              key={tab.label}
              onClick={() => setActiveTab(idx)}
              className={`px-3 py-2 text-label-sm transition-colors ${
                activeTab === idx
                  ? 'border-b-2 border-primary-base text-primary-base'
                  : 'text-text-sub-600 hover:text-text-strong-950'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className='flex-1' />
        <Input.Root size='medium'>
          <Input.Wrapper>
            <Input.Icon as={RiSearchLine} />
            <Input.Input
              placeholder='Buscar por fornecedor...'
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </Input.Wrapper>
        </Input.Root>
        </div>
      </div>

      {/* Table */}
        <Table.Root>
          <Table.Header>
            <Table.Row>
              <Table.Head>Fornecedor</Table.Head>
              <Table.Head>Status</Table.Head>
              <Table.Head>Data Solicitação</Table.Head>
              <Table.Head className='text-right'>Total</Table.Head>
              <Table.Head className='text-right'>Ações</Table.Head>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <Table.Row key={i}>
                  {Array.from({ length: 5 }).map((__, j) => (
                    <Table.Cell key={j}>
                      <div className='h-4 w-24 animate-pulse rounded bg-bg-weak-50' />
                    </Table.Cell>
                  ))}
                </Table.Row>
              ))
            ) : quotations.length === 0 ? (
              <Table.Row>
                <Table.Cell colSpan={5} className='text-center'>
                  <p className='py-8 text-paragraph-sm text-text-soft-400'>
                    {filters.search
                      ? 'Nenhuma cotação encontrada para esta busca.'
                      : 'Nenhuma cotação cadastrada.'}
                  </p>
                </Table.Cell>
              </Table.Row>
            ) : (
              quotations.map((quotation) => (
                <Table.Row key={quotation.id}>
                  <Table.Cell>
                    <Link
                      href={`/compras/cotacoes/${quotation.id}`}
                      className='text-label-sm text-text-strong-950 transition hover:text-primary-base'
                    >
                      {quotation.supplier?.name ?? '—'}
                    </Link>
                  </Table.Cell>
                  <Table.Cell>
                    <QuotationStatusBadge status={quotation.status} />
                  </Table.Cell>
                  <Table.Cell>
                    <span className='text-paragraph-sm text-text-sub-600'>
                      {formatDate(quotation.requestedAt)}
                    </span>
                  </Table.Cell>
                  <Table.Cell className='text-right'>
                    <span className='text-paragraph-sm text-text-strong-950'>
                      {formatCents(quotation.totalCents)}
                    </span>
                  </Table.Cell>
                  <Table.Cell className='text-right'>
                    <Button.Root
                      asChild
                      variant='neutral'
                      mode='ghost'
                      size='xxsmall'
                    >
                      <Link href={`/compras/cotacoes/${quotation.id}`}>
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
            {pagination.total} cotaç{pagination.total !== 1 ? 'ões' : 'ão'} no
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
