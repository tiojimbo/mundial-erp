'use client';

import Link from 'next/link';
import {
  RiArrowLeftLine,
  RiEditLine,
  RiBox3Line,
  RiRulerLine,
  RiFileTextLine,
  RiPriceTag3Line,
  RiFlaskLine,
  RiImageLine,
  RiArchiveStackLine,
} from '@remixicon/react';
import * as TabMenuHorizontal from '@/components/ui/tab-menu-horizontal';
import * as Button from '@/components/ui/button';
import * as Badge from '@/components/ui/badge';
import { useProduct } from '../hooks/use-products';
import { STATUS_LABELS, STATUS_COLORS } from '../utils/constants';
import { ProductDataTab } from './product-tabs/data-tab';
import { ProductSpecTab } from './product-tabs/spec-tab';
import { ProductFiscalTab } from './product-tabs/fiscal-tab';
import { ProductPricingTab } from './product-tabs/pricing-tab';
import { ProductFormulaTab } from './product-tabs/formula-tab';
import { ProductImagesTab } from './product-tabs/images-tab';
import { ProductStockTab } from './product-tabs/stock-tab';

type ProductDetailProps = {
  productId: string;
};

export function ProductDetail({ productId }: ProductDetailProps) {
  const { data: product, isLoading } = useProduct(productId);

  if (isLoading) {
    return (
      <div className='mx-auto max-w-5xl space-y-6'>
        <div className='h-8 w-48 animate-pulse rounded bg-bg-weak-50' />
        <div className='h-64 animate-pulse rounded-xl border border-stroke-soft-200 bg-bg-weak-50' />
      </div>
    );
  }

  if (!product) {
    return (
      <div className='mx-auto max-w-5xl space-y-6'>
        <div className='flex items-center gap-3'>
          <Button.Root asChild variant='neutral' mode='ghost' size='xsmall'>
            <Link href='/compras/produtos'>
              <Button.Icon as={RiArrowLeftLine} />
            </Link>
          </Button.Root>
          <h1 className='text-title-h5 text-text-strong-950'>
            Produto não encontrado
          </h1>
        </div>
      </div>
    );
  }

  return (
    <div className='mx-auto max-w-5xl space-y-6'>
      {/* Header */}
      <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
        <div className='flex items-center gap-3'>
          <Button.Root asChild variant='neutral' mode='ghost' size='xsmall'>
            <Link href='/compras/produtos'>
              <Button.Icon as={RiArrowLeftLine} />
            </Link>
          </Button.Root>
          <div>
            <div className='flex items-center gap-2'>
              <h1 className='text-title-h5 text-text-strong-950'>
                {product.name}
              </h1>
              <Badge.Root
                variant='lighter'
                color={STATUS_COLORS[product.status]}
                size='small'
              >
                {STATUS_LABELS[product.status]}
              </Badge.Root>
            </div>
            <p className='text-paragraph-sm text-text-sub-600'>
              <span className='font-mono'>{product.code}</span>
              {product.barcode && ` · EAN: ${product.barcode}`}
              {product.productType && ` · ${product.productType.name}`}
            </p>
          </div>
        </div>
        <Button.Root asChild variant='neutral' mode='stroke' size='small'>
          <Link href={`/compras/produtos/${productId}/editar`}>
            <Button.Icon as={RiEditLine} />
            Editar
          </Link>
        </Button.Root>
      </div>

      {/* Tabs */}
      <TabMenuHorizontal.Root defaultValue='dados'>
        <TabMenuHorizontal.List>
          <TabMenuHorizontal.Trigger value='dados'>
            <TabMenuHorizontal.Icon as={RiBox3Line} />
            Dados
          </TabMenuHorizontal.Trigger>
          <TabMenuHorizontal.Trigger value='especificacao'>
            <TabMenuHorizontal.Icon as={RiRulerLine} />
            Especificação
          </TabMenuHorizontal.Trigger>
          <TabMenuHorizontal.Trigger value='fiscal'>
            <TabMenuHorizontal.Icon as={RiFileTextLine} />
            Fiscal
          </TabMenuHorizontal.Trigger>
          <TabMenuHorizontal.Trigger value='precos'>
            <TabMenuHorizontal.Icon as={RiPriceTag3Line} />
            Preços
          </TabMenuHorizontal.Trigger>
          <TabMenuHorizontal.Trigger value='formula'>
            <TabMenuHorizontal.Icon as={RiFlaskLine} />
            Fórmula
          </TabMenuHorizontal.Trigger>
          <TabMenuHorizontal.Trigger value='imagens'>
            <TabMenuHorizontal.Icon as={RiImageLine} />
            Imagens
          </TabMenuHorizontal.Trigger>
          <TabMenuHorizontal.Trigger value='estoque'>
            <TabMenuHorizontal.Icon as={RiArchiveStackLine} />
            Estoque
          </TabMenuHorizontal.Trigger>
        </TabMenuHorizontal.List>

        <TabMenuHorizontal.Content value='dados' className='pt-6'>
          <ProductDataTab product={product} />
        </TabMenuHorizontal.Content>
        <TabMenuHorizontal.Content value='especificacao' className='pt-6'>
          <ProductSpecTab product={product} />
        </TabMenuHorizontal.Content>
        <TabMenuHorizontal.Content value='fiscal' className='pt-6'>
          <ProductFiscalTab product={product} />
        </TabMenuHorizontal.Content>
        <TabMenuHorizontal.Content value='precos' className='pt-6'>
          <ProductPricingTab product={product} />
        </TabMenuHorizontal.Content>
        <TabMenuHorizontal.Content value='formula' className='pt-6'>
          <ProductFormulaTab productId={productId} classification={product.classification} />
        </TabMenuHorizontal.Content>
        <TabMenuHorizontal.Content value='imagens' className='pt-6'>
          <ProductImagesTab product={product} />
        </TabMenuHorizontal.Content>
        <TabMenuHorizontal.Content value='estoque' className='pt-6'>
          <ProductStockTab product={product} productId={productId} />
        </TabMenuHorizontal.Content>
      </TabMenuHorizontal.Root>
    </div>
  );
}
