'use client';

import { RiFlaskLine } from '@remixicon/react';
import * as Table from '@/components/ui/table';
import { useProductFormula } from '../../hooks/use-products';
import type { ProductClassification } from '../../types/product.types';

type ProductFormulaTabProps = {
  productId: string;
  classification: ProductClassification | null;
};

export function ProductFormulaTab({
  productId,
  classification,
}: ProductFormulaTabProps) {
  const { data: formula, isLoading } = useProductFormula(productId);

  if (classification !== 'FABRICACAO_PROPRIA') {
    return (
      <div className='flex flex-col items-center justify-center py-12'>
        <RiFlaskLine className='mb-3 size-10 text-text-soft-400' />
        <p className='text-paragraph-sm text-text-soft-400'>
          Fórmula de composição disponível apenas para produtos de Fabricação
          Própria.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className='space-y-3'>
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className='h-12 animate-pulse rounded bg-bg-weak-50'
          />
        ))}
      </div>
    );
  }

  if (!formula) {
    return (
      <div className='flex flex-col items-center justify-center py-12'>
        <RiFlaskLine className='mb-3 size-10 text-text-soft-400' />
        <p className='text-paragraph-sm text-text-soft-400'>
          Nenhuma fórmula cadastrada para este produto.
        </p>
      </div>
    );
  }

  return (
    <div className='space-y-6'>
      <div className='rounded-xl border border-stroke-soft-200 bg-bg-white-0 p-5 shadow-regular-xs'>
        <div className='mb-4 flex items-center justify-between'>
          <h3 className='text-label-sm text-text-strong-950'>
            {formula.name}
          </h3>
          <span className='text-paragraph-sm text-text-sub-600'>
            Rendimento: {formula.yieldQuantity}
          </span>
        </div>

        <Table.Root>
          <Table.Header>
            <Table.Row>
              <Table.Head>Ingrediente</Table.Head>
              <Table.Head>Quantidade</Table.Head>
              <Table.Head>Unidade</Table.Head>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {formula.ingredients.length === 0 ? (
              <Table.Row>
                <Table.Cell colSpan={3} className='text-center'>
                  <p className='py-4 text-paragraph-sm text-text-soft-400'>
                    Nenhum ingrediente cadastrado.
                  </p>
                </Table.Cell>
              </Table.Row>
            ) : (
              formula.ingredients.map((ing) => (
                <Table.Row key={ing.id}>
                  <Table.Cell>
                    <span className='text-label-sm text-text-strong-950'>
                      {ing.ingredient?.name ?? ing.ingredientId}
                    </span>
                  </Table.Cell>
                  <Table.Cell>
                    <span className='text-paragraph-sm text-text-sub-600'>
                      {ing.quantity}
                    </span>
                  </Table.Cell>
                  <Table.Cell>
                    <span className='text-paragraph-sm text-text-sub-600'>
                      {ing.unitMeasure?.name ?? '—'}
                    </span>
                  </Table.Cell>
                </Table.Row>
              ))
            )}
          </Table.Body>
        </Table.Root>
      </div>
    </div>
  );
}
