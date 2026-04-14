'use client';

import Link from 'next/link';
import {
  RiArrowLeftLine,
  RiEditLine,
  RiUser3Line,
  RiShoppingBag3Line,
} from '@remixicon/react';
import * as TabMenuHorizontal from '@/components/ui/tab-menu-horizontal';
import * as Button from '@/components/ui/button';
import * as Badge from '@/components/ui/badge';
import { formatCpfCnpj } from '@/lib/formatters';
import { useSupplier } from '../hooks/use-suppliers';
import { SupplierDataTab } from './supplier-tabs/data-tab';
import { SupplierPurchasesTab } from './supplier-tabs/purchases-tab';

type SupplierDetailProps = {
  supplierId: string;
};

export function SupplierDetail({ supplierId }: SupplierDetailProps) {
  const { data: supplier, isLoading } = useSupplier(supplierId);

  if (isLoading) {
    return (
      <div className='mx-auto max-w-4xl space-y-6'>
        <div className='h-8 w-48 animate-pulse rounded bg-bg-weak-50' />
        <div className='h-64 animate-pulse rounded-xl border border-stroke-soft-200 bg-bg-weak-50' />
      </div>
    );
  }

  if (!supplier) {
    return (
      <div className='mx-auto max-w-4xl space-y-6'>
        <div className='flex items-center gap-3'>
          <Button.Root asChild variant='neutral' mode='ghost' size='xsmall'>
            <Link href='/compras/fornecedores'>
              <Button.Icon as={RiArrowLeftLine} />
            </Link>
          </Button.Root>
          <h1 className='text-title-h5 text-text-strong-950'>
            Fornecedor não encontrado
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
            <Link href='/compras/fornecedores'>
              <Button.Icon as={RiArrowLeftLine} />
            </Link>
          </Button.Root>
          <div>
            <div className='flex items-center gap-2'>
              <h1 className='text-title-h5 text-text-strong-950'>
                {supplier.name}
              </h1>
              <Badge.Root
                variant='lighter'
                color={supplier.personType === 'F' ? 'blue' : 'purple'}
                size='small'
              >
                {supplier.personType === 'F' ? 'PF' : 'PJ'}
              </Badge.Root>
              <Badge.Root
                variant='lighter'
                color={supplier.isActive ? 'green' : 'red'}
                size='small'
              >
                {supplier.isActive ? 'Ativo' : 'Inativo'}
              </Badge.Root>
            </div>
            <p className='text-paragraph-sm text-text-sub-600'>
              {formatCpfCnpj(supplier.cpfCnpj)}
              {supplier.tradeName && ` · ${supplier.tradeName}`}
            </p>
          </div>
        </div>
        <Button.Root asChild variant='neutral' mode='stroke' size='small'>
          <Link href={`/compras/fornecedores/${supplierId}/editar`}>
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
          <TabMenuHorizontal.Trigger value='compras'>
            <TabMenuHorizontal.Icon as={RiShoppingBag3Line} />
            Histórico de Compras
          </TabMenuHorizontal.Trigger>
        </TabMenuHorizontal.List>

        <TabMenuHorizontal.Content value='dados' className='pt-6'>
          <SupplierDataTab supplier={supplier} />
        </TabMenuHorizontal.Content>

        <TabMenuHorizontal.Content value='compras' className='pt-6'>
          <SupplierPurchasesTab supplierId={supplierId} />
        </TabMenuHorizontal.Content>
      </TabMenuHorizontal.Root>
    </div>
  );
}
