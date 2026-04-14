'use client';

import { RiArchiveStackLine } from '@remixicon/react';
import * as Table from '@/components/ui/table';
import { formatDate } from '@/lib/formatters';
import { useProductStockMovements } from '../../hooks/use-products';
import type { Product } from '../../types/product.types';

type ProductStockTabProps = {
  product: Product;
  productId: string;
};

export function ProductStockTab({ product, productId }: ProductStockTabProps) {
  const { data: movements, isLoading } = useProductStockMovements(productId);

  return (
    <div className='space-y-6'>
      {/* Current Stock Summary */}
      <div className='grid gap-4 sm:grid-cols-3'>
        <div className='rounded-xl border border-stroke-soft-200 bg-bg-white-0 p-5 shadow-regular-xs'>
          <span className='text-paragraph-xs text-text-soft-400'>
            Estoque Atual
          </span>
          <p className='mt-1 text-title-h4 text-text-strong-950'>
            {product.currentStock} {product.unitMeasure?.name ?? ''}
          </p>
        </div>
        <div className='rounded-xl border border-stroke-soft-200 bg-bg-white-0 p-5 shadow-regular-xs'>
          <span className='text-paragraph-xs text-text-soft-400'>
            Estoque Mínimo
          </span>
          <p className='mt-1 text-title-h4 text-text-sub-600'>
            {product.minStock ?? 0} {product.unitMeasure?.name ?? ''}
          </p>
        </div>
        <div className='rounded-xl border border-stroke-soft-200 bg-bg-white-0 p-5 shadow-regular-xs'>
          <span className='text-paragraph-xs text-text-soft-400'>
            Endereçamento
          </span>
          <p className='mt-1 text-title-h4 text-text-sub-600'>
            {product.stockLocation || '—'}
          </p>
        </div>
      </div>

      {/* Stock Movements */}
      <div className='rounded-xl border border-stroke-soft-200 bg-bg-white-0 p-5 shadow-regular-xs'>
        <h3 className='mb-4 text-label-sm text-text-strong-950'>
          Movimentações
        </h3>

        {isLoading ? (
          <div className='space-y-3'>
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className='h-10 animate-pulse rounded bg-bg-weak-50'
              />
            ))}
          </div>
        ) : !movements || movements.length === 0 ? (
          <div className='flex flex-col items-center justify-center py-8'>
            <RiArchiveStackLine className='mb-3 size-10 text-text-soft-400' />
            <p className='text-paragraph-sm text-text-soft-400'>
              Nenhuma movimentação registrada.
            </p>
          </div>
        ) : (
          <Table.Root>
            <Table.Header>
              <Table.Row>
                <Table.Head>Data</Table.Head>
                <Table.Head>Tipo</Table.Head>
                <Table.Head>Quantidade</Table.Head>
                <Table.Head>Referência</Table.Head>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {movements.map((mov) => (
                <Table.Row key={mov.id}>
                  <Table.Cell>
                    <span className='text-paragraph-sm text-text-sub-600'>
                      {formatDate(mov.createdAt)}
                    </span>
                  </Table.Cell>
                  <Table.Cell>
                    <span className='text-label-sm text-text-strong-950'>
                      {mov.type}
                    </span>
                  </Table.Cell>
                  <Table.Cell>
                    <span
                      className={`text-label-sm ${
                        mov.quantity >= 0
                          ? 'text-success-base'
                          : 'text-error-base'
                      }`}
                    >
                      {mov.quantity >= 0 ? '+' : ''}
                      {mov.quantity}
                    </span>
                  </Table.Cell>
                  <Table.Cell>
                    <span className='text-paragraph-sm text-text-sub-600'>
                      {mov.reference || '—'}
                    </span>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
        )}
      </div>
    </div>
  );
}
