'use client';

import * as Table from '@/components/ui/table';
import { formatCents } from '@/lib/formatters';
import type { PurchaseQuotation } from '../../types/quotation.types';

type Props = {
  quotation: PurchaseQuotation;
};

export function ItemsTab({ quotation }: Props) {
  return (
    <div className='flex flex-col gap-4'>
      <Table.Root>
        <Table.Header>
          <Table.Row>
            <Table.Head>Produto</Table.Head>
            <Table.Head>Código</Table.Head>
            <Table.Head className='text-right'>Quantidade</Table.Head>
            <Table.Head className='text-right'>Preço Unit.</Table.Head>
            <Table.Head className='text-right'>Total</Table.Head>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {quotation.items.length === 0 && (
            <Table.Row>
              <Table.Cell colSpan={5} className='text-center text-text-soft-400'>
                Nenhum item nesta cotação.
              </Table.Cell>
            </Table.Row>
          )}

          {quotation.items.map((item) => {
            const totalCents = item.unitPriceCents * item.quantity;
            return (
              <Table.Row key={item.id}>
                <Table.Cell>
                  <span className='font-medium text-text-strong-950'>
                    {item.product?.name ?? 'Produto'}
                  </span>
                </Table.Cell>
                <Table.Cell className='text-text-sub-600'>
                  {item.product?.code ?? '—'}
                </Table.Cell>
                <Table.Cell className='text-right'>{item.quantity}</Table.Cell>
                <Table.Cell className='text-right'>
                  {item.unitPriceCents > 0 ? formatCents(item.unitPriceCents) : '—'}
                </Table.Cell>
                <Table.Cell className='text-right font-medium'>
                  {item.unitPriceCents > 0 ? formatCents(totalCents) : '—'}
                </Table.Cell>
              </Table.Row>
            );
          })}
        </Table.Body>
      </Table.Root>

      {/* Total */}
      {quotation.totalCents > 0 && (
        <div className='flex justify-end'>
          <div className='w-64 space-y-1 rounded-lg bg-bg-weak-50 p-4'>
            <div className='border-t border-stroke-soft-200 pt-1'>
              <div className='flex justify-between text-label-md'>
                <span className='text-text-strong-950'>Total</span>
                <span className='text-text-strong-950'>{formatCents(quotation.totalCents)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
