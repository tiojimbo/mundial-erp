'use client';

import * as Table from '@/components/ui/table';
import { formatCents, formatQuantity } from '@/lib/formatters';
import type { ProductionOrder } from '../../types/production.types';

type Props = {
  order: ProductionOrder;
};

export function ConsumptionTab({ order }: Props) {
  const consumptions = order.consumptions ?? [];

  if (consumptions.length === 0) {
    return (
      <div className='flex flex-col items-center justify-center gap-2 py-12 text-text-soft-400'>
        <i className='ri-flask-line text-3xl' />
        <p className='text-paragraph-sm'>Nenhum consumo de materia-prima registrado</p>
        {order.status === 'IN_PROGRESS' && (
          <p className='text-paragraph-xs'>Registre o consumo durante a producao</p>
        )}
      </div>
    );
  }

  const totalPlanned = consumptions.reduce((acc, c) => acc + c.plannedQuantity, 0);
  const totalActual = consumptions.reduce((acc, c) => acc + (c.actualQuantity ?? 0), 0);
  const totalCost = consumptions.reduce((acc, c) => acc + c.totalCostCents, 0);

  return (
    <div className='flex flex-col gap-4'>
      {/* Summary cards */}
      <div className='grid grid-cols-3 gap-3'>
        <div className='rounded-lg border border-stroke-soft-200 p-3'>
          <span className='text-subheading-2xs uppercase text-text-soft-400'>
            Planejado Total
          </span>
          <p className='text-label-md text-text-strong-950'>
            {formatQuantity(totalPlanned)}
          </p>
        </div>
        <div className='rounded-lg border border-stroke-soft-200 p-3'>
          <span className='text-subheading-2xs uppercase text-text-soft-400'>
            Consumo Real
          </span>
          <p className='text-label-md text-text-strong-950'>
            {formatQuantity(totalActual)}
          </p>
        </div>
        <div className='rounded-lg border border-stroke-soft-200 p-3'>
          <span className='text-subheading-2xs uppercase text-text-soft-400'>
            Custo Total
          </span>
          <p className='text-label-md text-text-strong-950'>
            {formatCents(totalCost)}
          </p>
        </div>
      </div>

      {/* Table */}
      <Table.Root>
        <Table.Header>
          <Table.Row>
            <Table.Head>Ingrediente</Table.Head>
            <Table.Head>Codigo</Table.Head>
            <Table.Head className='text-right'>Planejado</Table.Head>
            <Table.Head className='text-right'>Real</Table.Head>
            <Table.Head className='text-right'>Variacao</Table.Head>
            <Table.Head className='text-right'>Custo Unit.</Table.Head>
            <Table.Head className='text-right'>Custo Total</Table.Head>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {consumptions.map((c) => {
            const variance =
              c.actualQuantity !== null
                ? c.actualQuantity - c.plannedQuantity
                : null;
            return (
              <Table.Row key={c.id}>
                <Table.Cell className='font-medium'>
                  {c.ingredient?.name ?? 'Ingrediente'}
                </Table.Cell>
                <Table.Cell className='text-text-sub-600'>
                  {c.ingredient?.code ?? '-'}
                </Table.Cell>
                <Table.Cell className='text-right'>
                  {formatQuantity(c.plannedQuantity)}
                </Table.Cell>
                <Table.Cell className='text-right'>
                  {formatQuantity(c.actualQuantity)}
                </Table.Cell>
                <Table.Cell className='text-right'>
                  {variance !== null ? (
                    <span
                      className={
                        variance > 0
                          ? 'text-state-error-base'
                          : variance < 0
                            ? 'text-state-success-base'
                            : 'text-text-sub-600'
                      }
                    >
                      {variance > 0 ? '+' : ''}
                      {formatQuantity(variance)}
                    </span>
                  ) : (
                    '-'
                  )}
                </Table.Cell>
                <Table.Cell className='text-right'>
                  {formatCents(c.costCents)}
                </Table.Cell>
                <Table.Cell className='text-right font-medium'>
                  {formatCents(c.totalCostCents)}
                </Table.Cell>
              </Table.Row>
            );
          })}
        </Table.Body>
      </Table.Root>
    </div>
  );
}
