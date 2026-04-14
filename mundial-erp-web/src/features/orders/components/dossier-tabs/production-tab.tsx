'use client';

import * as Table from '@/components/ui/table';
import * as Badge from '@/components/ui/badge';
import { formatCurrency } from '../../lib/format';
import type {
  ProductionOrder,
  SeparationOrder,
  ProductionOrderStatus,
  SeparationOrderStatus,
  OrderStatus,
} from '../../types/order.types';

type BadgeColor = React.ComponentProps<typeof Badge.Root>['color'];

const PO_STATUS_MAP: Record<ProductionOrderStatus, { label: string; color: BadgeColor }> = {
  PENDING: { label: 'Pendente', color: 'orange' },
  IN_PROGRESS: { label: 'Em andamento', color: 'purple' },
  COMPLETED: { label: 'Concluida', color: 'green' },
  CANCELLED: { label: 'Cancelada', color: 'red' },
};

const SO_STATUS_MAP: Record<SeparationOrderStatus, { label: string; color: BadgeColor }> = {
  PENDING: { label: 'Pendente', color: 'orange' },
  IN_PROGRESS: { label: 'Em andamento', color: 'purple' },
  SEPARATED: { label: 'Separado', color: 'teal' },
  CHECKED: { label: 'Conferido', color: 'green' },
};

const VISIBLE_AFTER: OrderStatus[] = ['FATURADO', 'PRODUZIR', 'EM_PRODUCAO', 'PRODUZIDO', 'ENTREGUE'];

type Props = {
  orderStatus: OrderStatus;
  productionOrders: ProductionOrder[];
  separationOrders: SeparationOrder[];
};

export function ProductionTab({ orderStatus, productionOrders, separationOrders }: Props) {
  if (!VISIBLE_AFTER.includes(orderStatus)) {
    return (
      <div className='flex flex-col items-center justify-center gap-2 py-12 text-text-soft-400'>
        <i className='ri-hammer-line text-3xl' />
        <p className='text-paragraph-sm'>Producao disponivel apos faturamento</p>
        <p className='text-paragraph-xs'>
          Ordens de producao e separacao sao criadas automaticamente
        </p>
      </div>
    );
  }

  return (
    <div className='flex flex-col gap-6'>
      {/* Production Orders */}
      <section>
        <h3 className='mb-3 text-label-md text-text-strong-950'>
          <i className='ri-hammer-line mr-1.5' />
          Ordens de Producao
        </h3>
        {productionOrders.length === 0 ? (
          <p className='text-paragraph-sm text-text-soft-400'>Nenhuma OP registrada</p>
        ) : (
          productionOrders.map((po) => {
            const statusConfig = PO_STATUS_MAP[po.status];
            return (
              <div key={po.id} className='mb-4 rounded-lg border border-stroke-soft-200 p-4'>
                <div className='mb-3 flex items-center justify-between'>
                  <div className='flex items-center gap-2'>
                    <span className='text-label-sm font-medium'>{po.code}</span>
                    <Badge.Root color={statusConfig.color} variant='lighter' size='small'>
                      <Badge.Dot />
                      {statusConfig.label}
                    </Badge.Root>
                  </div>
                  <span className='text-paragraph-xs text-text-sub-600'>
                    Tipo: {po.type}
                  </span>
                </div>

                {/* PO Items */}
                <Table.Root>
                  <Table.Header>
                    <Table.Row>
                      <Table.Head>Produto</Table.Head>
                      <Table.Head className='text-right'>Qtd</Table.Head>
                      <Table.Head className='text-right'>Pecas</Table.Head>
                      <Table.Head className='text-right'>Tamanho</Table.Head>
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    {po.items.map((item) => (
                      <Table.Row key={item.id}>
                        <Table.Cell>
                          {item.product?.code ?? '-'} - {item.product?.name ?? 'Produto'}
                        </Table.Cell>
                        <Table.Cell className='text-right'>{item.quantity}</Table.Cell>
                        <Table.Cell className='text-right'>{item.pieces ?? '-'}</Table.Cell>
                        <Table.Cell className='text-right'>{item.size ?? '-'}</Table.Cell>
                      </Table.Row>
                    ))}
                  </Table.Body>
                </Table.Root>

                {/* Consumptions */}
                {po.consumptions.length > 0 && (
                  <div className='mt-3'>
                    <span className='text-subheading-2xs uppercase text-text-soft-400'>
                      Materia-Prima Consumida
                    </span>
                    <Table.Root>
                      <Table.Header>
                        <Table.Row>
                          <Table.Head>Ingrediente</Table.Head>
                          <Table.Head className='text-right'>Planejado</Table.Head>
                          <Table.Head className='text-right'>Real</Table.Head>
                          <Table.Head className='text-right'>Custo</Table.Head>
                        </Table.Row>
                      </Table.Header>
                      <Table.Body>
                        {po.consumptions.map((c) => (
                          <Table.Row key={c.id}>
                            <Table.Cell>
                              {c.ingredient?.code ?? '-'} - {c.ingredient?.name ?? 'Ingrediente'}
                            </Table.Cell>
                            <Table.Cell className='text-right'>{c.plannedQuantity}</Table.Cell>
                            <Table.Cell className='text-right'>{c.actualQuantity ?? '-'}</Table.Cell>
                            <Table.Cell className='text-right'>
                              {formatCurrency(c.totalCostCents)}
                            </Table.Cell>
                          </Table.Row>
                        ))}
                      </Table.Body>
                    </Table.Root>
                  </div>
                )}
              </div>
            );
          })
        )}
      </section>

      {/* Separation Orders */}
      {separationOrders.length > 0 && (
        <section>
          <h3 className='mb-3 text-label-md text-text-strong-950'>
            <i className='ri-inbox-unarchive-line mr-1.5' />
            Ordens de Separacao
          </h3>
          {separationOrders.map((so) => {
            const statusConfig = SO_STATUS_MAP[so.status];
            return (
              <div key={so.id} className='mb-4 rounded-lg border border-stroke-soft-200 p-4'>
                <div className='mb-3 flex items-center justify-between'>
                  <div className='flex items-center gap-2'>
                    <span className='text-label-sm font-medium'>{so.code}</span>
                    <Badge.Root color={statusConfig.color} variant='lighter' size='small'>
                      <Badge.Dot />
                      {statusConfig.label}
                    </Badge.Root>
                  </div>
                </div>
                <Table.Root>
                  <Table.Header>
                    <Table.Row>
                      <Table.Head>Produto</Table.Head>
                      <Table.Head className='text-right'>Qtd</Table.Head>
                      <Table.Head>Local</Table.Head>
                      <Table.Head>Separado</Table.Head>
                      <Table.Head>Conferido</Table.Head>
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    {so.items.map((item) => (
                      <Table.Row key={item.id}>
                        <Table.Cell>
                          {item.product?.code ?? '-'} - {item.product?.name ?? 'Produto'}
                        </Table.Cell>
                        <Table.Cell className='text-right'>{item.quantity}</Table.Cell>
                        <Table.Cell>{item.stockLocation ?? '-'}</Table.Cell>
                        <Table.Cell>
                          {item.isSeparated ? (
                            <i className='ri-checkbox-circle-line text-state-success-base' />
                          ) : (
                            <i className='ri-checkbox-blank-circle-line text-text-soft-400' />
                          )}
                        </Table.Cell>
                        <Table.Cell>
                          {item.isChecked ? (
                            <i className='ri-checkbox-circle-line text-state-success-base' />
                          ) : (
                            <i className='ri-checkbox-blank-circle-line text-text-soft-400' />
                          )}
                        </Table.Cell>
                      </Table.Row>
                    ))}
                  </Table.Body>
                </Table.Root>
              </div>
            );
          })}
        </section>
      )}
    </div>
  );
}
