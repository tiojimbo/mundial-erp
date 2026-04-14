'use client';

import * as Table from '@/components/ui/table';
import { formatCents, formatQuantity } from '@/lib/formatters';
import type { ProductionOrder } from '../../types/production.types';

type Props = {
  order: ProductionOrder;
};

export function LossesTab({ order }: Props) {
  const losses = order.losses ?? [];

  if (losses.length === 0) {
    return (
      <div className='flex flex-col items-center justify-center gap-2 py-12 text-text-soft-400'>
        <i className='ri-error-warning-line text-3xl' />
        <p className='text-paragraph-sm'>Nenhuma perda registrada</p>
      </div>
    );
  }

  const totalCost = losses.reduce((acc, l) => acc + (l.costCents ?? 0), 0);

  return (
    <div className='flex flex-col gap-4'>
      {totalCost > 0 && (
        <div className='rounded-lg border border-state-error-lighter bg-state-error-lighter/10 p-3'>
          <span className='text-subheading-2xs uppercase text-state-error-base'>
            Custo Total de Perdas
          </span>
          <p className='text-label-md text-state-error-base'>
            {formatCents(totalCost)}
          </p>
        </div>
      )}

      <Table.Root>
        <Table.Header>
          <Table.Row>
            <Table.Head>Descricao</Table.Head>
            <Table.Head className='text-right'>Quantidade</Table.Head>
            <Table.Head className='text-right'>Custo</Table.Head>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {losses.map((l) => (
            <Table.Row key={l.id}>
              <Table.Cell className='font-medium'>
                {l.description || 'Perda nao descrita'}
              </Table.Cell>
              <Table.Cell className='text-right'>
                {formatQuantity(l.quantity)}
              </Table.Cell>
              <Table.Cell className='text-right'>
                {l.costCents !== null ? formatCents(l.costCents) : '-'}
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table.Root>
    </div>
  );
}
