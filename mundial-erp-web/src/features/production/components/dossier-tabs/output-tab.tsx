'use client';

import * as Table from '@/components/ui/table';
import { formatQuantity } from '@/lib/formatters';
import type { ProductionOrder } from '../../types/production.types';

type Props = {
  order: ProductionOrder;
};

export function OutputTab({ order }: Props) {
  const outputs = order.outputs ?? [];

  if (outputs.length === 0) {
    return (
      <div className='flex flex-col items-center justify-center gap-2 py-12 text-text-soft-400'>
        <i className='ri-box-3-line text-3xl' />
        <p className='text-paragraph-sm'>Nenhum produto acabado registrado</p>
        {order.status === 'IN_PROGRESS' && (
          <p className='text-paragraph-xs'>Registre a saida de producao</p>
        )}
      </div>
    );
  }

  const totalQuantity = outputs.reduce((acc, o) => acc + o.quantity, 0);

  return (
    <div className='flex flex-col gap-4'>
      <div className='rounded-lg border border-stroke-soft-200 p-3'>
        <span className='text-subheading-2xs uppercase text-text-soft-400'>
          Total Produzido
        </span>
        <p className='text-label-md text-text-strong-950'>
          {formatQuantity(totalQuantity)} unidades
        </p>
      </div>

      <Table.Root>
        <Table.Header>
          <Table.Row>
            <Table.Head>Produto</Table.Head>
            <Table.Head>Codigo</Table.Head>
            <Table.Head className='text-right'>Quantidade</Table.Head>
            <Table.Head>Operacao</Table.Head>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {outputs.map((o) => (
            <Table.Row key={o.id}>
              <Table.Cell className='font-medium'>
                {o.product?.name ?? 'Produto'}
              </Table.Cell>
              <Table.Cell className='text-text-sub-600'>
                {o.product?.code ?? '-'}
              </Table.Cell>
              <Table.Cell className='text-right'>
                {formatQuantity(o.quantity)}
              </Table.Cell>
              <Table.Cell className='text-text-sub-600'>
                {o.operation === 'E' ? 'Entrada' : o.operation}
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table.Root>
    </div>
  );
}
