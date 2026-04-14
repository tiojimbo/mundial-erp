'use client';

import Link from 'next/link';
import {
  RiArrowLeftLine,
  RiEditLine,
  RiUser3Line,
  RiShoppingBag3Line,
  RiMoneyDollarCircleLine,
} from '@remixicon/react';
import * as TabMenuHorizontal from '@/components/ui/tab-menu-horizontal';
import * as Button from '@/components/ui/button';
import * as Badge from '@/components/ui/badge';
import { formatCpfCnpj } from '@/lib/formatters';
import { useClient } from '../hooks/use-clients';
import { ClientDataTab } from './client-tabs/data-tab';
import { ClientOrdersTab } from './client-tabs/orders-tab';
import { ClientFinancialTab } from './client-tabs/financial-tab';

type ClientDetailProps = {
  clientId: string;
};

export function ClientDetail({ clientId }: ClientDetailProps) {
  const { data: client, isLoading } = useClient(clientId);

  if (isLoading) {
    return (
      <div className='mx-auto max-w-4xl space-y-6'>
        <div className='h-8 w-48 animate-pulse rounded bg-bg-weak-50' />
        <div className='h-64 animate-pulse rounded-xl border border-stroke-soft-200 bg-bg-weak-50' />
      </div>
    );
  }

  if (!client) {
    return (
      <div className='mx-auto max-w-4xl space-y-6'>
        <div className='flex items-center gap-3'>
          <Button.Root asChild variant='neutral' mode='ghost' size='xsmall'>
            <Link href='/comercial/clientes'>
              <Button.Icon as={RiArrowLeftLine} />
            </Link>
          </Button.Root>
          <h1 className='text-title-h5 text-text-strong-950'>
            Cliente não encontrado
          </h1>
        </div>
      </div>
    );
  }

  return (
    <div className='mx-auto max-w-4xl space-y-6'>
      {/* Header */}
      <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
        <div className='flex items-center gap-3'>
          <Button.Root asChild variant='neutral' mode='ghost' size='xsmall'>
            <Link href='/comercial/clientes'>
              <Button.Icon as={RiArrowLeftLine} />
            </Link>
          </Button.Root>
          <div>
            <div className='flex items-center gap-2'>
              <h1 className='text-title-h5 text-text-strong-950'>
                {client.name}
              </h1>
              <Badge.Root
                variant='lighter'
                color={client.personType === 'F' ? 'blue' : 'purple'}
                size='small'
              >
                {client.personType === 'F' ? 'PF' : 'PJ'}
              </Badge.Root>
            </div>
            <p className='text-paragraph-sm text-text-sub-600'>
              {formatCpfCnpj(client.cpfCnpj)}
              {client.tradeName && ` · ${client.tradeName}`}
            </p>
          </div>
        </div>
        <Button.Root asChild variant='neutral' mode='stroke' size='small'>
          <Link href={`/comercial/clientes/${clientId}/editar`}>
            <Button.Icon as={RiEditLine} />
            Editar
          </Link>
        </Button.Root>
      </div>

      {/* Tabs */}
      <TabMenuHorizontal.Root defaultValue='dados'>
        <TabMenuHorizontal.List>
          <TabMenuHorizontal.Trigger value='dados'>
            <TabMenuHorizontal.Icon as={RiUser3Line} />
            Dados
          </TabMenuHorizontal.Trigger>
          <TabMenuHorizontal.Trigger value='pedidos'>
            <TabMenuHorizontal.Icon as={RiShoppingBag3Line} />
            Pedidos
          </TabMenuHorizontal.Trigger>
          <TabMenuHorizontal.Trigger value='financeiro'>
            <TabMenuHorizontal.Icon as={RiMoneyDollarCircleLine} />
            Financeiro
          </TabMenuHorizontal.Trigger>
        </TabMenuHorizontal.List>

        <TabMenuHorizontal.Content value='dados' className='pt-6'>
          <ClientDataTab client={client} />
        </TabMenuHorizontal.Content>

        <TabMenuHorizontal.Content value='pedidos' className='pt-6'>
          <ClientOrdersTab clientId={clientId} />
        </TabMenuHorizontal.Content>

        <TabMenuHorizontal.Content value='financeiro' className='pt-6'>
          <ClientFinancialTab clientId={clientId} />
        </TabMenuHorizontal.Content>
      </TabMenuHorizontal.Root>
    </div>
  );
}
