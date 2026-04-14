'use client';

import { formatCurrency } from '@/lib/formatters';
import type { Product } from '../../types/product.types';

type ProductPricingTabProps = {
  product: Product;
};

function PriceCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number | null;
  color: string;
}) {
  return (
    <div className='rounded-xl border border-stroke-soft-200 bg-bg-white-0 p-5 shadow-regular-xs'>
      <span className='text-paragraph-xs text-text-soft-400'>{label}</span>
      <p className={`mt-1 text-title-h4 ${color}`}>
        {value != null ? formatCurrency(value / 100) : '—'}
      </p>
    </div>
  );
}

export function ProductPricingTab({ product }: ProductPricingTabProps) {
  return (
    <div className='space-y-6'>
      <div className='grid gap-4 sm:grid-cols-3'>
        <PriceCard
          label='Preço de Custo'
          value={product.costPrice}
          color='text-text-sub-600'
        />
        <PriceCard
          label='Preço de Venda'
          value={product.salePrice}
          color='text-success-base'
        />
        <PriceCard
          label='Preço Mínimo'
          value={product.minSalePrice}
          color='text-warning-base'
        />
      </div>

      {product.costPrice != null &&
        product.salePrice != null &&
        product.costPrice > 0 && (
          <div className='rounded-xl border border-stroke-soft-200 bg-bg-white-0 p-5 shadow-regular-xs'>
            <h3 className='mb-4 text-label-sm text-text-strong-950'>
              Margem
            </h3>
            <div className='grid gap-4 sm:grid-cols-2'>
              <div className='flex flex-col gap-0.5'>
                <span className='text-paragraph-xs text-text-soft-400'>
                  Markup
                </span>
                <span className='text-paragraph-sm text-text-strong-950'>
                  {(
                    ((product.salePrice - product.costPrice) /
                      product.costPrice) *
                    100
                  ).toFixed(1)}
                  %
                </span>
              </div>
              <div className='flex flex-col gap-0.5'>
                <span className='text-paragraph-xs text-text-soft-400'>
                  Margem Bruta
                </span>
                <span className='text-paragraph-sm text-text-strong-950'>
                  {(
                    ((product.salePrice - product.costPrice) /
                      product.salePrice) *
                    100
                  ).toFixed(1)}
                  %
                </span>
              </div>
            </div>
          </div>
        )}

      <div className='rounded-xl border border-stroke-soft-200 bg-bg-white-0 p-5 shadow-regular-xs'>
        <h3 className='mb-4 text-label-sm text-text-strong-950'>
          Tabela de Preço
        </h3>
        <div className='flex flex-col gap-0.5'>
          <span className='text-paragraph-xs text-text-soft-400'>
            Tabela Padrão
          </span>
          <span className='text-paragraph-sm text-text-strong-950'>
            {product.defaultPriceTableId || '—'}
          </span>
        </div>
      </div>
    </div>
  );
}
