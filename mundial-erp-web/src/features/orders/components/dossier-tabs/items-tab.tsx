'use client';

import { useState } from 'react';
import * as Table from '@/components/ui/table';
import * as Checkbox from '@/components/ui/checkbox';
import * as Badge from '@/components/ui/badge';
import { useToggleSupply } from '../../hooks/use-orders';
import { formatCurrency } from '../../lib/format';
import type { Order, OrderItemSupply, ProductionOrder } from '../../types/order.types';

type Props = {
  order: Order;
};

function SupplyChecklist({
  orderId,
  itemId,
  supplies,
  editable,
}: {
  orderId: string;
  itemId: string;
  supplies: OrderItemSupply[];
  editable: boolean;
}) {
  const toggleSupply = useToggleSupply(orderId);

  if (supplies.length === 0) return null;

  return (
    <div className='mt-2 flex flex-col gap-1.5 rounded-lg bg-bg-weak-50 p-3'>
      <span className='text-subheading-2xs uppercase text-text-soft-400'>
        Insumos / Acabamentos
      </span>
      {supplies.map((supply) => {
        const isReady = supply.status === 'READY';
        return (
          <label
            key={supply.id}
            className='flex items-center gap-2 text-paragraph-sm'
          >
            <Checkbox.Root
              checked={isReady}
              disabled={!editable || toggleSupply.isPending}
              onCheckedChange={() => {
                toggleSupply.mutate({
                  itemId,
                  supplyId: supply.id,
                  status: isReady ? 'PENDING' : 'READY',
                });
              }}
            />
            <span className={isReady ? 'text-text-soft-400 line-through' : 'text-text-strong-950'}>
              {supply.name}
              {supply.quantity > 1 && ` (x${supply.quantity})`}
            </span>
            {isReady && (
              <Badge.Root color='green' variant='lighter' size='small'>
                Pronto
              </Badge.Root>
            )}
          </label>
        );
      })}
    </div>
  );
}

function InlineProductionInfo({
  orderItemId,
  productionOrders,
}: {
  orderItemId: string;
  productionOrders: ProductionOrder[];
}) {
  for (const po of productionOrders) {
    const poItem = po.items.find((i) => i.orderItemId === orderItemId);
    if (!poItem) continue;

    const relatedConsumptions = po.consumptions;
    if (relatedConsumptions.length === 0) return null;

    return (
      <div className='mt-2 rounded-lg border border-stroke-soft-200 bg-bg-white-0 p-3'>
        <span className='text-subheading-2xs uppercase text-text-soft-400'>
          Ordem de Producao: {po.code}
        </span>
        <div className='mt-1.5 flex flex-col gap-1'>
          {relatedConsumptions.map((c) => (
            <div key={c.id} className='flex items-center justify-between text-paragraph-xs'>
              <span className='text-text-sub-600'>
                {c.ingredient?.name ?? 'Ingrediente'}
              </span>
              <div className='flex items-center gap-3'>
                <span className='text-text-soft-400'>
                  Plan: {c.plannedQuantity}
                </span>
                {c.actualQuantity != null && (
                  <span className='text-text-strong-950'>
                    Real: {c.actualQuantity}
                  </span>
                )}
                <span className='font-medium'>
                  {formatCurrency(c.totalCostCents)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
}

export function ItemsTab({ order }: Props) {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  // Supplies are toggleable during production stages (not during EM_ORCAMENTO where items are editable)
  const canToggleSupplies = ['FATURADO', 'PRODUZIR', 'EM_PRODUCAO', 'PRODUZIDO', 'ENTREGUE'].includes(order.status);
  // Show production info after FATURADO
  const showProduction = canToggleSupplies;

  function toggleExpand(itemId: string) {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  }

  return (
    <div className='flex flex-col gap-4'>
      <Table.Root>
        <Table.Header>
          <Table.Row>
            <Table.Head className='w-8' />
            <Table.Head>Produto</Table.Head>
            <Table.Head>Classificacao</Table.Head>
            <Table.Head className='text-right'>Qtd</Table.Head>
            <Table.Head className='text-right'>Pecas</Table.Head>
            <Table.Head className='text-right'>Tamanho</Table.Head>
            <Table.Head className='text-right'>V. Unit.</Table.Head>
            <Table.Head className='text-right'>Desconto</Table.Head>
            <Table.Head className='text-right'>Total</Table.Head>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {order.items.map((item) => {
            const isExpanded = expandedItems.has(item.id);
            const hasExpandableContent = item.supplies.length > 0 || (showProduction && order.productionOrders?.length > 0);

            return (
              <Table.Row key={item.id} className='group'>
                <Table.Cell>
                  {hasExpandableContent && (
                    <button
                      onClick={() => toggleExpand(item.id)}
                      className='rounded p-0.5 text-text-sub-600 hover:bg-bg-weak-50'
                    >
                      <i className={`ri-arrow-${isExpanded ? 'down' : 'right'}-s-line`} />
                    </button>
                  )}
                </Table.Cell>
                <Table.Cell>
                  <div className='flex flex-col'>
                    <span className='font-medium text-text-strong-950'>
                      {item.product?.code ?? '-'} - {item.product?.name ?? 'Produto'}
                    </span>

                    {isExpanded && (
                      <>
                        <SupplyChecklist
                          orderId={order.id}
                          itemId={item.id}
                          supplies={item.supplies}
                          editable={canToggleSupplies}
                        />
                        {showProduction && (
                          <InlineProductionInfo
                            orderItemId={item.id}
                            productionOrders={order.productionOrders ?? []}
                          />
                        )}
                      </>
                    )}
                  </div>
                </Table.Cell>
                <Table.Cell>
                  <span className='text-paragraph-xs text-text-sub-600'>
                    {item.classificationSnapshot ?? '-'}
                  </span>
                </Table.Cell>
                <Table.Cell className='text-right'>{item.quantity}</Table.Cell>
                <Table.Cell className='text-right'>{item.pieces ?? '-'}</Table.Cell>
                <Table.Cell className='text-right'>{item.size ?? '-'}</Table.Cell>
                <Table.Cell className='text-right'>
                  {formatCurrency(item.unitPriceCents)}
                </Table.Cell>
                <Table.Cell className='text-right'>
                  {item.discountCents > 0 ? formatCurrency(item.discountCents) : '-'}
                </Table.Cell>
                <Table.Cell className='text-right font-medium'>
                  {formatCurrency(item.totalCents)}
                </Table.Cell>
              </Table.Row>
            );
          })}
        </Table.Body>
      </Table.Root>

      {/* Totals */}
      <div className='flex justify-end'>
        <div className='w-64 space-y-1 rounded-lg bg-bg-weak-50 p-4'>
          <div className='flex justify-between text-paragraph-sm'>
            <span className='text-text-sub-600'>Subtotal</span>
            <span>{formatCurrency(order.subtotalCents)}</span>
          </div>
          {order.freightCents > 0 && (
            <div className='flex justify-between text-paragraph-sm'>
              <span className='text-text-sub-600'>Frete</span>
              <span>{formatCurrency(order.freightCents)}</span>
            </div>
          )}
          {order.discountCents > 0 && (
            <div className='flex justify-between text-paragraph-sm'>
              <span className='text-text-sub-600'>Desconto</span>
              <span className='text-state-error-base'>-{formatCurrency(order.discountCents)}</span>
            </div>
          )}
          {order.taxSubstitutionCents > 0 && (
            <div className='flex justify-between text-paragraph-sm'>
              <span className='text-text-sub-600'>Subst. Tributaria</span>
              <span>{formatCurrency(order.taxSubstitutionCents)}</span>
            </div>
          )}
          <div className='border-t border-stroke-soft-200 pt-1'>
            <div className='flex justify-between text-label-md'>
              <span className='text-text-strong-950'>Total</span>
              <span className='text-text-strong-950'>{formatCurrency(order.totalCents)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
