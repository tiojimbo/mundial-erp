'use client';

import * as Table from '@/components/ui/table';
import { formatQuantity } from '@/lib/formatters';
import type { ProductionOrder } from '../../types/production.types';

type Props = {
  order: ProductionOrder;
};

export function ItemsTab({ order }: Props) {
  const items = order.items ?? [];

  if (items.length === 0) {
    return (
      <div className='flex flex-col items-center justify-center gap-2 py-12 text-text-soft-400'>
        <i className='ri-list-check-2 text-3xl' />
        <p className='text-paragraph-sm'>Nenhum item na ordem de producao</p>
      </div>
    );
  }

  return (
    <Table.Root>
      <Table.Header>
        <Table.Row>
          <Table.Head>Produto</Table.Head>
          <Table.Head>Codigo</Table.Head>
          <Table.Head className='text-right'>Quantidade</Table.Head>
          <Table.Head className='text-right'>Pecas</Table.Head>
          <Table.Head className='text-right'>Tamanho</Table.Head>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {items.map((item) => (
          <Table.Row key={item.id}>
            <Table.Cell className='font-medium'>
              {item.product?.name ?? 'Produto'}
            </Table.Cell>
            <Table.Cell className='text-text-sub-600'>
              {item.product?.code ?? '-'}
            </Table.Cell>
            <Table.Cell className='text-right'>
              {formatQuantity(item.quantity)}
            </Table.Cell>
            <Table.Cell className='text-right'>
              {formatQuantity(item.pieces)}
            </Table.Cell>
            <Table.Cell className='text-right'>
              {formatQuantity(item.size)}
            </Table.Cell>
          </Table.Row>
        ))}
      </Table.Body>
    </Table.Root>
  );
}
