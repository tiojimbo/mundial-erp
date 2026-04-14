'use client';

import Link from 'next/link';
import * as TabMenu from '@/components/ui/tab-menu-horizontal';
import * as Button from '@/components/ui/button';
import { useProductionOrder } from '../hooks/use-production';
import { POStatusBadge } from './po-status-badge';
import { POStatusStepper } from './po-status-stepper';
import { POActions } from './po-actions';
import { ItemsTab } from './dossier-tabs/items-tab';
import { ConsumptionTab } from './dossier-tabs/consumption-tab';
import { OutputTab } from './dossier-tabs/output-tab';
import { LossesTab } from './dossier-tabs/losses-tab';
import { CostsTab } from './dossier-tabs/costs-tab';
import { formatDate } from '@/lib/formatters';

type Props = {
  productionOrderId: string;
};

export function ProductionDossier({ productionOrderId }: Props) {
  const { data: order, isLoading, error } = useProductionOrder(productionOrderId);

  if (isLoading) {
    return (
      <div className='flex flex-col gap-6'>
        <div className='h-8 w-48 animate-pulse rounded bg-bg-weak-50' />
        <div className='h-12 animate-pulse rounded-lg bg-bg-weak-50' />
        <div className='h-48 animate-pulse rounded-lg bg-bg-weak-50' />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className='flex flex-col items-center justify-center gap-4 py-16'>
        <i className='ri-error-warning-line text-4xl text-state-error-base' />
        <p className='text-paragraph-md text-text-strong-950'>
          Ordem de producao nao encontrada
        </p>
        <Link href='/producao/ordens'>
          <Button.Root variant='neutral' mode='stroke' size='small'>
            Voltar para lista
          </Button.Root>
        </Link>
      </div>
    );
  }

  return (
    <div className='flex flex-col gap-5'>
      {/* Header */}
      <div className='flex items-start justify-between'>
        <div className='flex items-center gap-3'>
          <Link
            href='/producao/ordens'
            className='rounded-lg p-1.5 text-text-sub-600 hover:bg-bg-weak-50'
          >
            <i className='ri-arrow-left-line text-xl' />
          </Link>
          <div>
            <div className='flex items-center gap-2'>
              <h1 className='text-title-h5 text-text-strong-950'>
                OP {order.code}
              </h1>
              <POStatusBadge status={order.status} />
            </div>
            <p className='text-paragraph-sm text-text-sub-600'>
              Pedido #{order.order?.orderNumber ?? '-'} ·{' '}
              {order.order?.client?.name ?? 'Cliente nao informado'}
            </p>
            <div className='flex items-center gap-3 text-paragraph-xs text-text-soft-400'>
              {order.assignedUser && (
                <span>
                  <i className='ri-user-line mr-1' />
                  {order.assignedUser.name}
                </span>
              )}
              {order.scheduledDate && (
                <span>
                  <i className='ri-calendar-line mr-1' />
                  Agendado: {formatDate(order.scheduledDate)}
                </span>
              )}
              {order.completedDate && (
                <span>
                  <i className='ri-checkbox-circle-line mr-1' />
                  Concluido: {formatDate(order.completedDate)}
                </span>
              )}
              <span>Tipo: {order.type}</span>
              {order.batch && <span>Lote: {order.batch}</span>}
            </div>
          </div>
        </div>

        <POActions order={order} />
      </div>

      {/* Status Stepper */}
      <POStatusStepper currentStatus={order.status} />

      {/* Notes */}
      {order.notes && (
        <div className='rounded-lg border border-stroke-soft-200 bg-bg-weak-50 px-4 py-3'>
          <span className='text-subheading-2xs uppercase text-text-soft-400'>
            Observacoes
          </span>
          <p className='text-paragraph-sm text-text-strong-950'>{order.notes}</p>
        </div>
      )}

      {/* Tabs */}
      <TabMenu.Root defaultValue='itens'>
        <TabMenu.List>
          <TabMenu.Trigger value='itens'>
            <TabMenu.Icon as='i' className='ri-list-check-2' />
            Itens
          </TabMenu.Trigger>
          <TabMenu.Trigger value='consumo'>
            <TabMenu.Icon as='i' className='ri-flask-line' />
            Materia-Prima
            {order.consumptions.length > 0 && (
              <span className='ml-1 text-paragraph-xs text-text-soft-400'>
                ({order.consumptions.length})
              </span>
            )}
          </TabMenu.Trigger>
          <TabMenu.Trigger value='saida'>
            <TabMenu.Icon as='i' className='ri-box-3-line' />
            Produto Acabado
            {order.outputs.length > 0 && (
              <span className='ml-1 text-paragraph-xs text-text-soft-400'>
                ({order.outputs.length})
              </span>
            )}
          </TabMenu.Trigger>
          <TabMenu.Trigger value='perdas'>
            <TabMenu.Icon as='i' className='ri-error-warning-line' />
            Perdas
            {order.losses.length > 0 && (
              <span className='ml-1 text-paragraph-xs text-text-soft-400'>
                ({order.losses.length})
              </span>
            )}
          </TabMenu.Trigger>
          <TabMenu.Trigger value='custos'>
            <TabMenu.Icon as='i' className='ri-money-dollar-circle-line' />
            Custos
          </TabMenu.Trigger>
        </TabMenu.List>

        <TabMenu.Content value='itens' className='pt-4'>
          <ItemsTab order={order} />
        </TabMenu.Content>

        <TabMenu.Content value='consumo' className='pt-4'>
          <ConsumptionTab order={order} />
        </TabMenu.Content>

        <TabMenu.Content value='saida' className='pt-4'>
          <OutputTab order={order} />
        </TabMenu.Content>

        <TabMenu.Content value='perdas' className='pt-4'>
          <LossesTab order={order} />
        </TabMenu.Content>

        <TabMenu.Content value='custos' className='pt-4'>
          <CostsTab order={order} />
        </TabMenu.Content>
      </TabMenu.Root>
    </div>
  );
}
