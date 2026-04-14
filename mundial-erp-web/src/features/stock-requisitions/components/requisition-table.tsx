'use client';

import { useState } from 'react';
import Link from 'next/link';
import { RiMoreLine, RiDeleteBinLine } from '@remixicon/react';
import * as Table from '@/components/ui/table';
import * as Button from '@/components/ui/button';
import * as Pagination from '@/components/ui/pagination';
import * as Dropdown from '@/components/ui/dropdown';
import * as Modal from '@/components/ui/modal';

import { formatDate } from '@/lib/formatters';
import { RequisitionStatusBadge, RequisitionTypeBadge } from './requisition-status-badge';
import { useStockRequisitions, useDeleteRequisition } from '../hooks/use-stock-requisitions';
import type { RequisitionStatus, RequisitionFilters, StockRequisitionSummary } from '../types/stock-requisition.types';

const STATUS_TABS: { label: string; filter: RequisitionStatus[] | undefined }[] = [
  { label: 'Todas', filter: undefined },
  { label: 'Pendentes', filter: ['PENDING'] },
  { label: 'Aprovadas', filter: ['APPROVED'] },
  { label: 'Processadas', filter: ['PROCESSED'] },
  { label: 'Canceladas', filter: ['CANCELLED'] },
];

export function RequisitionTable() {
  const [activeTab, setActiveTab] = useState(0);
  const [page, setPage] = useState(1);
  const limit = 20;

  const filters: RequisitionFilters = {
    page,
    limit,
    status: STATUS_TABS[activeTab].filter,
  };

  const [deleteTarget, setDeleteTarget] = useState<StockRequisitionSummary | null>(null);
  const deleteMutation = useDeleteRequisition();

  const { data, isLoading } = useStockRequisitions(filters);
  const requisitions = data?.data ?? [];
  const totalPages = data?.meta?.pagination?.totalPages ?? 1;

  return (
    <div className='flex flex-col gap-5'>
      {/* Header */}
      <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
        <div>
          <h1 className='text-title-h5 text-text-strong-950'>Requisicoes de Estoque</h1>
          <p className='text-paragraph-sm text-text-sub-600'>
            Gerencie requisicoes internas e de venda para saida de estoque
          </p>
        </div>
        <div className='flex items-center gap-3'>
          <Link href='/compras/requisicoes/processar'>
            <Button.Root variant='neutral' mode='stroke' size='small'>
              <Button.Icon as='i' className='ri-barcode-line' />
              Processar Scanner
            </Button.Root>
          </Link>
          <Link href='/compras/requisicoes/nova'>
            <Button.Root variant='primary' mode='filled' size='small'>
              <Button.Icon as='i' className='ri-add-line' />
              Nova Requisicao
            </Button.Root>
          </Link>
        </div>
      </div>

      {/* Status tabs */}
      <div className='border-b border-stroke-soft-200'>
        <div className='flex flex-col gap-3 sm:flex-row'>
        <div className='flex items-center gap-1'>
          {STATUS_TABS.map((tab, idx) => (
            <button
              key={tab.label}
              onClick={() => { setActiveTab(idx); setPage(1); }}
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
        </div>
      </div>

      {/* Table */}
        <Table.Root>
          <Table.Header>
            <Table.Row>
              <Table.Head>Codigo</Table.Head>
              <Table.Head>Tipo</Table.Head>
              <Table.Head>Status</Table.Head>
              <Table.Head>Solicitante</Table.Head>
              <Table.Head>Itens</Table.Head>
              <Table.Head>Data</Table.Head>
              <Table.Head className='w-10'>Acoes</Table.Head>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {isLoading && (
              <>
                {Array.from({ length: 5 }).map((_, i) => (
                  <Table.Row key={i}>
                    <Table.Cell colSpan={7}>
                      <div className='h-5 animate-pulse rounded bg-bg-weak-50' />
                    </Table.Cell>
                  </Table.Row>
                ))}
              </>
            )}

            {!isLoading && requisitions.length === 0 && (
              <Table.Row>
                <Table.Cell colSpan={7} className='text-center text-text-soft-400'>
                  Nenhuma requisicao encontrada
                </Table.Cell>
              </Table.Row>
            )}

            {!isLoading &&
              requisitions.map((req) => (
                <Table.Row key={req.id}>
                  <Table.Cell>
                    <Link
                      href={`/compras/requisicoes/${req.id}`}
                      className='font-medium text-primary-base hover:underline'
                    >
                      {req.code}
                    </Link>
                  </Table.Cell>
                  <Table.Cell>
                    <RequisitionTypeBadge type={req.type} />
                  </Table.Cell>
                  <Table.Cell>
                    <RequisitionStatusBadge status={req.status} />
                  </Table.Cell>
                  <Table.Cell className='text-text-sub-600'>
                    {req.requestedByName ?? '-'}
                  </Table.Cell>
                  <Table.Cell className='text-text-sub-600'>
                    {req._count?.items ?? '-'}
                  </Table.Cell>
                  <Table.Cell className='text-text-sub-600'>
                    {formatDate(req.requestedAt)}
                  </Table.Cell>
                  <Table.Cell>
                    <div className='flex items-center gap-1'>
                      <Link
                        href={`/compras/requisicoes/${req.id}`}
                        className='rounded p-1 text-text-sub-600 hover:bg-bg-weak-50'
                      >
                        <i className='ri-eye-line text-lg' />
                      </Link>
                      <Dropdown.Root>
                        <Dropdown.Trigger asChild>
                          <button className='rounded p-1 text-text-sub-600 hover:bg-bg-weak-50'>
                            <RiMoreLine className='size-5' />
                          </button>
                        </Dropdown.Trigger>
                        <Dropdown.Content align='end' sideOffset={4} className='w-[200px]'>
                          <Dropdown.Item
                            onSelect={() => setDeleteTarget(req)}
                            className='text-error-base'
                          >
                            <Dropdown.ItemIcon as={RiDeleteBinLine} className='text-error-base' />
                            Excluir
                          </Dropdown.Item>
                        </Dropdown.Content>
                      </Dropdown.Root>
                    </div>
                  </Table.Cell>
                </Table.Row>
              ))}
          </Table.Body>
        </Table.Root>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className='flex items-center justify-between'>
          <span className='text-paragraph-sm text-text-sub-600'>
            Pagina {page} de {totalPages}
          </span>
          <Pagination.Root variant='basic'>
            <Pagination.NavButton
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              <Pagination.NavIcon as='i' className='ri-arrow-left-s-line' />
            </Pagination.NavButton>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
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
              <Pagination.NavIcon as='i' className='ri-arrow-right-s-line' />
            </Pagination.NavButton>
          </Pagination.Root>
        </div>
      )}

      {/* Delete confirmation modal */}
      <Modal.Root open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <Modal.Content className='w-[480px] max-w-[480px]'>
          <div className='flex flex-col items-start px-6 pb-2 pt-6'>
            <div className='flex size-9 items-center justify-center rounded-[10px] bg-error-lighter'>
              <RiDeleteBinLine className='size-5 text-error-base' />
            </div>
            <h2 className='mt-4 text-[16px] font-semibold text-text-strong-950'>
              Excluir requisição
            </h2>
            <p className='mt-1.5 text-[14px] leading-relaxed text-text-sub-600'>
              Tem certeza de que deseja excluir a requisição{' '}
              <strong>{deleteTarget?.code}</strong>? Esta ação não pode ser desfeita.
            </p>
          </div>
          <div className='flex gap-3 border-t border-stroke-soft-200 px-6 py-4'>
            <Button.Root
              variant='neutral'
              mode='stroke'
              size='medium'
              className='flex-1'
              onClick={() => setDeleteTarget(null)}
            >
              Cancelar
            </Button.Root>
            <Button.Root
              variant='error'
              mode='filled'
              size='medium'
              className='flex-1'
              disabled={deleteMutation.isPending}
              onClick={() => {
                if (!deleteTarget) return;
                deleteMutation.mutate(deleteTarget.id, {
                  onSuccess: () => setDeleteTarget(null),
                });
              }}
            >
              {deleteMutation.isPending ? 'Excluindo...' : 'Excluir'}
            </Button.Root>
          </div>
        </Modal.Content>
      </Modal.Root>
    </div>
  );
}
