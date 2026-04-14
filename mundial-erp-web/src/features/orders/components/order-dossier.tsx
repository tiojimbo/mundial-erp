'use client';

import Link from 'next/link';
import * as TabMenu from '@/components/ui/tab-menu-horizontal';
import * as Button from '@/components/ui/button';
import { useOrder } from '../hooks/use-orders';
import { OrderStatusStepper } from './order-status-stepper';
import { OrderPaymentBadge } from './order-payment-badge';
import { ProcessContextBar } from './process-context-bar';
import { OrderContextualActions } from './order-contextual-actions';
import { OrderActionsDropdown } from './order-actions-dropdown';
import { OrderStatusBadge } from './order-status-badge';
import { OrderHandoffBanner } from './order-handoff-banner';
import { ItemsTab } from './dossier-tabs/items-tab';
import { FinancialTab } from './dossier-tabs/financial-tab';
import { ProductionTab } from './dossier-tabs/production-tab';
import { InvoicesTab } from './dossier-tabs/invoices-tab';
import { TimelineTab } from './dossier-tabs/timeline-tab';

type Props = {
  orderId: string;
};

export function OrderDossier({ orderId }: Props) {
  const { data: order, isLoading, error } = useOrder(orderId);

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
        <p className='text-paragraph-md text-text-strong-950'>Pedido nao encontrado</p>
        <Link href='/comercial/pedidos'>
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
            href='/comercial/pedidos'
            className='rounded-lg p-1.5 text-text-sub-600 hover:bg-bg-weak-50'
          >
            <i className='ri-arrow-left-line text-xl' />
          </Link>
          <div>
            <div className='flex items-center gap-2'>
              <h1 className='text-title-h5 text-text-strong-950'>
                Pedido #{order.orderNumber}
              </h1>
              <OrderStatusBadge status={order.status} />
            </div>
            {order.title && (
              <p className='text-paragraph-sm text-text-sub-600'>{order.title}</p>
            )}
            <p className='text-paragraph-xs text-text-soft-400'>
              Cliente: {order.client?.name ?? '-'} · Criado por: {order.createdByUser?.name ?? '-'}
            </p>
          </div>
        </div>

        <div className='flex items-center gap-2'>
          <OrderActionsDropdown order={order} />
        </div>
      </div>

      {/* Process Context Bar */}
      <ProcessContextBar processInstances={order.processInstances ?? []} />

      {/* Handoff banner */}
      <OrderHandoffBanner order={order} />

      {/* Stepper */}
      <OrderStatusStepper
        currentStatus={order.status}
        statusHistory={order.statusHistory}
      />

      {/* Payment badge + contextual actions */}
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <OrderPaymentBadge
          totalCents={order.totalCents}
          paidAmountCents={order.paidAmountCents}
          paymentProofUrl={order.paymentProofUrl}
        />
        <OrderContextualActions order={order} />
      </div>

      {/* Tabs */}
      <TabMenu.Root defaultValue='itens'>
        <TabMenu.List>
          <TabMenu.Trigger value='itens'>
            <TabMenu.Icon as='i' className='ri-list-check-2' />
            Itens
          </TabMenu.Trigger>
          <TabMenu.Trigger value='financeiro'>
            <TabMenu.Icon as='i' className='ri-money-dollar-circle-line' />
            Financeiro
          </TabMenu.Trigger>
          <TabMenu.Trigger value='producao'>
            <TabMenu.Icon as='i' className='ri-hammer-line' />
            Producao
          </TabMenu.Trigger>
          <TabMenu.Trigger value='nfe'>
            <TabMenu.Icon as='i' className='ri-file-list-3-line' />
            NF-e
          </TabMenu.Trigger>
          <TabMenu.Trigger value='timeline'>
            <TabMenu.Icon as='i' className='ri-time-line' />
            Timeline
          </TabMenu.Trigger>
        </TabMenu.List>

        <TabMenu.Content value='itens' className='pt-4'>
          <ItemsTab order={order} />
        </TabMenu.Content>

        <TabMenu.Content value='financeiro' className='pt-4'>
          <FinancialTab accountsReceivable={order.accountsReceivable ?? []} />
        </TabMenu.Content>

        <TabMenu.Content value='producao' className='pt-4'>
          <ProductionTab
            orderStatus={order.status}
            productionOrders={order.productionOrders ?? []}
            separationOrders={order.separationOrders ?? []}
          />
        </TabMenu.Content>

        <TabMenu.Content value='nfe' className='pt-4'>
          <InvoicesTab invoices={order.invoices ?? []} />
        </TabMenu.Content>

        <TabMenu.Content value='timeline' className='pt-4'>
          <TimelineTab orderId={order.id} />
        </TabMenu.Content>
      </TabMenu.Root>
    </div>
  );
}
