'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  RiSearchLine,
  RiAddLine,
  RiArrowLeftSLine,
  RiArrowRightSLine,
  RiEyeLine,
  RiEditLine,
  RiDeleteBinLine,
} from '@remixicon/react';
import * as Table from '@/components/ui/table';
import * as Input from '@/components/ui/input';
import * as Button from '@/components/ui/button';
import * as Badge from '@/components/ui/badge';
import * as Pagination from '@/components/ui/pagination';

import { useDebounce } from '@/hooks/use-debounce';
import { formatCpfCnpj } from '@/lib/formatters';
import { useSuppliers, useDeleteSupplier } from '../hooks/use-suppliers';
import type { SupplierFilters } from '../types/supplier.types';

export function SupplierTable() {
  const router = useRouter();
  const [filters, setFilters] = useState<SupplierFilters>({
    page: 1,
    limit: 20,
    search: '',
  });
  const [searchInput, setSearchInput] = useState('');
  const [activeFilter, setActiveFilter] = useState<boolean | undefined>(undefined);
  const debouncedSearch = useDebounce(searchInput, 300);
  const { data, isLoading } = useSuppliers(filters);
  const deleteMutation = useDeleteSupplier();

  const suppliers = data?.data ?? [];
  const pagination = data?.meta?.pagination;

  useEffect(() => {
    setFilters((prev) => ({ ...prev, page: 1, search: debouncedSearch }));
  }, [debouncedSearch]);

  useEffect(() => {
    setFilters((prev) => ({ ...prev, page: 1, isActive: activeFilter }));
  }, [activeFilter]);

  function handlePageChange(page: number) {
    setFilters((prev) => ({ ...prev, page }));
  }

  function handleDelete(id: string, name: string) {
    if (confirm(`Tem certeza que deseja excluir o fornecedor "${name}"?`)) {
      deleteMutation.mutate(id);
    }
  }

  return (
    <div className='space-y-4'>
      {/* Header */}
      <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
        <div>
          <h1 className='text-title-h5 text-text-strong-950'>Fornecedores</h1>
          <p className='text-paragraph-sm text-text-sub-600'>
            Gerencie seus fornecedores e parceiros comerciais.
          </p>
        </div>
        <div className='flex items-center gap-3'>
          <Button.Root asChild variant='primary' mode='filled' size='medium'>
            <Link href='/compras/fornecedores/novo'>
              <Button.Icon as={RiAddLine} />
              Novo Fornecedor
            </Link>
          </Button.Root>
        </div>
      </div>

      {/* Search + Filters */}
      <div className='flex flex-col gap-3 sm:flex-row'>
        <div className='flex-1'>
          <Input.Root size='medium'>
            <Input.Wrapper>
              <Input.Icon as={RiSearchLine} />
              <Input.Input
                placeholder='Buscar por nome, CPF/CNPJ...'
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </Input.Wrapper>
          </Input.Root>
        </div>
        <div className='flex gap-2'>
          <button
            type='button'
            onClick={() => setActiveFilter(undefined)}
            className='contents'
          >
            <Badge.Root
              variant={activeFilter === undefined ? 'filled' : 'lighter'}
              color='gray'
              size='small'
              className='cursor-pointer'
            >
              Todos
            </Badge.Root>
          </button>
          <button
            type='button'
            onClick={() => setActiveFilter(true)}
            className='contents'
          >
            <Badge.Root
              variant={activeFilter === true ? 'filled' : 'lighter'}
              color='green'
              size='small'
              className='cursor-pointer'
            >
              Ativos
            </Badge.Root>
          </button>
          <button
            type='button'
            onClick={() => setActiveFilter(false)}
            className='contents'
          >
            <Badge.Root
              variant={activeFilter === false ? 'filled' : 'lighter'}
              color='red'
              size='small'
              className='cursor-pointer'
            >
              Inativos
            </Badge.Root>
          </button>
        </div>
      </div>

      {/* Table */}
        <Table.Root>
          <Table.Header>
            <Table.Row>
              <Table.Head>Nome</Table.Head>
              <Table.Head>CPF/CNPJ</Table.Head>
              <Table.Head>Tipo</Table.Head>
              <Table.Head>Cidade/UF</Table.Head>
              <Table.Head>Telefone</Table.Head>
              <Table.Head>Status</Table.Head>
              <Table.Head className='text-right'>Ações</Table.Head>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <Table.Row key={i}>
                  {Array.from({ length: 7 }).map((__, j) => (
                    <Table.Cell key={j}>
                      <div className='h-4 w-24 animate-pulse rounded bg-bg-weak-50' />
                    </Table.Cell>
                  ))}
                </Table.Row>
              ))
            ) : suppliers.length === 0 ? (
              <Table.Row>
                <Table.Cell colSpan={7} className='text-center'>
                  <p className='py-8 text-paragraph-sm text-text-soft-400'>
                    {filters.search
                      ? 'Nenhum fornecedor encontrado para esta busca.'
                      : 'Nenhum fornecedor cadastrado.'}
                  </p>
                </Table.Cell>
              </Table.Row>
            ) : (
              suppliers.map((supplier) => (
                <Table.Row key={supplier.id}>
                  <Table.Cell>
                    <button
                      onClick={() =>
                        router.push(`/compras/fornecedores/${supplier.id}`)
                      }
                      className='text-left text-label-sm text-text-strong-950 transition hover:text-primary-base'
                    >
                      {supplier.name}
                      {supplier.tradeName && (
                        <span className='ml-1 text-paragraph-xs text-text-soft-400'>
                          ({supplier.tradeName})
                        </span>
                      )}
                    </button>
                  </Table.Cell>
                  <Table.Cell>
                    <span className='text-paragraph-sm text-text-sub-600'>
                      {formatCpfCnpj(supplier.cpfCnpj)}
                    </span>
                  </Table.Cell>
                  <Table.Cell>
                    <Badge.Root
                      variant='lighter'
                      color={supplier.personType === 'F' ? 'blue' : 'purple'}
                      size='small'
                    >
                      {supplier.personType === 'F' ? 'Pessoa Física' : 'Pessoa Jurídica'}
                    </Badge.Root>
                  </Table.Cell>
                  <Table.Cell>
                    <span className='text-paragraph-sm text-text-sub-600'>
                      {supplier.city && supplier.state
                        ? `${supplier.city}/${supplier.state}`
                        : '—'}
                    </span>
                  </Table.Cell>
                  <Table.Cell>
                    <span className='text-paragraph-sm text-text-sub-600'>
                      {supplier.phone || '—'}
                    </span>
                  </Table.Cell>
                  <Table.Cell>
                    <Badge.Root
                      variant='lighter'
                      color={supplier.isActive ? 'green' : 'red'}
                      size='small'
                    >
                      {supplier.isActive ? 'Ativo' : 'Inativo'}
                    </Badge.Root>
                  </Table.Cell>
                  <Table.Cell className='text-right'>
                    <div className='flex items-center justify-end gap-1'>
                      <Button.Root
                        asChild
                        variant='neutral'
                        mode='ghost'
                        size='xxsmall'
                      >
                        <Link href={`/compras/fornecedores/${supplier.id}`}>
                          <Button.Icon as={RiEyeLine} />
                        </Link>
                      </Button.Root>
                      <Button.Root
                        asChild
                        variant='neutral'
                        mode='ghost'
                        size='xxsmall'
                      >
                        <Link href={`/compras/fornecedores/${supplier.id}/editar`}>
                          <Button.Icon as={RiEditLine} />
                        </Link>
                      </Button.Root>
                      <Button.Root
                        variant='error'
                        mode='ghost'
                        size='xxsmall'
                        onClick={() => handleDelete(supplier.id, supplier.name)}
                        disabled={deleteMutation.isPending}
                      >
                        <Button.Icon as={RiDeleteBinLine} />
                      </Button.Root>
                    </div>
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
            {pagination.total} fornecedor{pagination.total !== 1 ? 'es' : ''} no
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
