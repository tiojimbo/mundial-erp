'use client';

import type { Product } from '../../types/product.types';

type ProductFiscalTabProps = {
  product: Product;
};

function DataRow({
  label,
  value,
}: {
  label: string;
  value: string | number | null | undefined;
}) {
  return (
    <div className='flex flex-col gap-0.5'>
      <span className='text-paragraph-xs text-text-soft-400'>{label}</span>
      <span className='text-paragraph-sm text-text-strong-950'>
        {value ?? '—'}
      </span>
    </div>
  );
}

export function ProductFiscalTab({ product }: ProductFiscalTabProps) {
  return (
    <div className='space-y-6'>
      <div className='rounded-xl border border-stroke-soft-200 bg-bg-white-0 p-5 shadow-regular-xs'>
        <h3 className='mb-4 text-label-sm text-text-strong-950'>
          Fiscal e Tributação
        </h3>
        <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
          <DataRow label='NCM' value={product.ncmCode} />
          <DataRow label='CFOP Padrão' value={product.cfopDefault} />
          <DataRow label='Origem NFe' value={product.nfeOriginId} />
          <DataRow
            label='Alíquota IPI (%)'
            value={product.ipiRate != null ? `${product.ipiRate}%` : null}
          />
          <DataRow label='Cesta de Tributação' value={product.taxBasketId} />
        </div>
      </div>
    </div>
  );
}
