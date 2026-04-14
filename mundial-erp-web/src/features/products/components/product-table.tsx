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
import * as Select from '@/components/ui/select';
import * as Pagination from '@/components/ui/pagination';

import { useDebounce } from '@/hooks/use-debounce';
import { formatCurrency } from '@/lib/formatters';
import {
  useProducts,
  useDeleteProduct,
  useProductDepartments,
} from '../hooks/use-products';
import {
  CLASSIFICATION_LABELS,
  CLASSIFICATION_COLORS,
  STATUS_LABELS,
  STATUS_COLORS,
} from '../utils/constants';
import type {
  ProductFilters,
  ProductClassification,
  ProductStatus,
} from '../types/product.types';

export function ProductTable() {
  const router = useRouter();
  const [filters, setFilters] = useState<ProductFilters>({
    page: 1,
    limit: 20,
    search: '',
  });
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebounce(searchInput, 300);
  const { data, isLoading } = useProducts(filters);
  const deleteMutation = useDeleteProduct();
  const { data: departments } = useProductDepartments();

  const products = data?.data ?? [];
  const pagination = data?.meta?.pagination;

  useEffect(() => {
    setFilters((prev) => ({ ...prev, page: 1, search: debouncedSearch }));
  }, [debouncedSearch]);

  function handlePageChange(page: number) {
    setFilters((prev) => ({ ...prev, page }));
  }

  function handleDelete(id: string, name: string) {
    if (confirm(`Tem certeza que deseja excluir o produto "${name}"?`)) {
      deleteMutation.mutate(id);
    }
  }

  return (
    <div className='space-y-4'>
      {/* Header */}
      <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
        <div>
          <h1 className='text-title-h5 text-text-strong-950'>Produtos</h1>
          <p className='text-paragraph-sm text-text-sub-600'>
            Catálogo de produtos com gestão completa.
          </p>
        </div>
        <div className='flex items-center gap-3'>
          <Button.Root asChild variant='primary' mode='filled' size='medium'>
            <Link href='/compras/produtos/novo'>
              <Button.Icon as={RiAddLine} />
              Novo Produto
            </Link>
          </Button.Root>
        </div>
      </div>

      {/* Filters */}
      <div className='flex flex-col gap-3 sm:flex-row'>
        <div className='flex-1'>
          <Input.Root size='medium'>
            <Input.Wrapper>
              <Input.Icon as={RiSearchLine} />
              <Input.Input
                placeholder='Buscar por nome, código, EAN...'
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </Input.Wrapper>
          </Input.Root>
        </div>
        <Select.Root
          value={filters.classification || ''}
          onValueChange={(val) =>
            setFilters((prev) => ({
              ...prev,
              page: 1,
              classification: (val || undefined) as
                | ProductClassification
                | undefined,
            }))
          }
        >
          <Select.Trigger className='w-full sm:w-48'>
            <Select.Value placeholder='Classificação' />
          </Select.Trigger>
          <Select.Content>
            {(
              Object.entries(CLASSIFICATION_LABELS) as [
                ProductClassification,
                string,
              ][]
            ).map(([value, label]) => (
              <Select.Item key={value} value={value}>
                {label}
              </Select.Item>
            ))}
          </Select.Content>
        </Select.Root>
        <Select.Root
          value={filters.departmentCategoryId || ''}
          onValueChange={(val) =>
            setFilters((prev) => ({
              ...prev,
              page: 1,
              departmentCategoryId: val || undefined,
            }))
          }
        >
          <Select.Trigger className='w-full sm:w-48'>
            <Select.Value placeholder='Departamento' />
          </Select.Trigger>
          <Select.Content>
            {departments?.map((d) => (
              <Select.Item key={d.id} value={d.id}>
                {d.name}
              </Select.Item>
            ))}
          </Select.Content>
        </Select.Root>
        <Select.Root
          value={filters.status || ''}
          onValueChange={(val) =>
            setFilters((prev) => ({
              ...prev,
              page: 1,
              status: (val || undefined) as ProductStatus | undefined,
            }))
          }
        >
          <Select.Trigger className='w-full sm:w-36'>
            <Select.Value placeholder='Status' />
          </Select.Trigger>
          <Select.Content>
            {(
              Object.entries(STATUS_LABELS) as [ProductStatus, string][]
            ).map(([value, label]) => (
              <Select.Item key={value} value={value}>
                {label}
              </Select.Item>
            ))}
          </Select.Content>
        </Select.Root>
      </div>

      {/* Table */}
        <Table.Root>
          <Table.Header>
            <Table.Row>
              <Table.Head>Código</Table.Head>
              <Table.Head>Nome</Table.Head>
              <Table.Head>Classificação</Table.Head>
              <Table.Head>Departamento</Table.Head>
              <Table.Head>Preço Venda</Table.Head>
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
            ) : products.length === 0 ? (
              <Table.Row>
                <Table.Cell colSpan={7} className='text-center'>
                  <p className='py-8 text-paragraph-sm text-text-soft-400'>
                    {filters.search
                      ? 'Nenhum produto encontrado para esta busca.'
                      : 'Nenhum produto cadastrado.'}
                  </p>
                </Table.Cell>
              </Table.Row>
            ) : (
              products.map((product) => (
                <Table.Row key={product.id}>
                  <Table.Cell>
                    <span className='font-mono text-label-sm text-text-strong-950'>
                      {product.code}
                    </span>
                  </Table.Cell>
                  <Table.Cell>
                    <button
                      onClick={() =>
                        router.push(`/compras/produtos/${product.id}`)
                      }
                      className='text-left text-label-sm text-text-strong-950 transition hover:text-primary-base'
                    >
                      {product.name}
                    </button>
                  </Table.Cell>
                  <Table.Cell>
                    {product.classification && (
                      <Badge.Root
                        variant='lighter'
                        color={CLASSIFICATION_COLORS[product.classification]}
                        size='small'
                      >
                        {CLASSIFICATION_LABELS[product.classification]}
                      </Badge.Root>
                    )}
                  </Table.Cell>
                  <Table.Cell>
                    <span className='text-paragraph-sm text-text-sub-600'>
                      {product.departmentCategory?.name || '—'}
                    </span>
                  </Table.Cell>
                  <Table.Cell>
                    <span className='text-paragraph-sm text-text-sub-600'>
                      {product.salePrice
                        ? formatCurrency(product.salePrice / 100)
                        : '—'}
                    </span>
                  </Table.Cell>
                  <Table.Cell>
                    <Badge.Root
                      variant='lighter'
                      color={STATUS_COLORS[product.status]}
                      size='small'
                    >
                      {STATUS_LABELS[product.status]}
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
                        <Link href={`/compras/produtos/${product.id}`}>
                          <Button.Icon as={RiEyeLine} />
                        </Link>
                      </Button.Root>
                      <Button.Root
                        asChild
                        variant='neutral'
                        mode='ghost'
                        size='xxsmall'
                      >
                        <Link href={`/compras/produtos/${product.id}/editar`}>
                          <Button.Icon as={RiEditLine} />
                        </Link>
                      </Button.Root>
                      <Button.Root
                        variant='error'
                        mode='ghost'
                        size='xxsmall'
                        onClick={() => handleDelete(product.id, product.name)}
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
            {pagination.total} produto{pagination.total !== 1 ? 's' : ''} no
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
