'use client';

import { CLASSIFICATION_LABELS } from '../../utils/constants';
import type { Product } from '../../types/product.types';

type ProductSpecTabProps = {
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

export function ProductSpecTab({ product }: ProductSpecTabProps) {
  return (
    <div className='space-y-6'>
      {/* Classification */}
      <div className='rounded-xl border border-stroke-soft-200 bg-bg-white-0 p-5 shadow-regular-xs'>
        <h3 className='mb-4 text-label-sm text-text-strong-950'>
          Classificação
        </h3>
        <DataRow
          label='Classificação Operacional'
          value={
            product.classification
              ? CLASSIFICATION_LABELS[product.classification]
              : null
          }
        />
      </div>

      {/* Dimensions */}
      <div className='rounded-xl border border-stroke-soft-200 bg-bg-white-0 p-5 shadow-regular-xs'>
        <h3 className='mb-4 text-label-sm text-text-strong-950'>Dimensões</h3>
        <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
          <DataRow
            label='Peso (kg)'
            value={product.weight}
          />
          <DataRow
            label='Largura (m)'
            value={product.width}
          />
          <DataRow
            label='Altura (m)'
            value={product.height}
          />
          <DataRow
            label='Comprimento (m)'
            value={product.length}
          />
        </div>
      </div>

      {/* Technical Details */}
      <div className='rounded-xl border border-stroke-soft-200 bg-bg-white-0 p-5 shadow-regular-xs'>
        <h3 className='mb-4 text-label-sm text-text-strong-950'>
          Dados Técnicos
        </h3>
        <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
          <DataRow label='Peso M3' value={product.weightM3} />
          <DataRow
            label='Cap. Produtiva'
            value={product.productionCapacity}
          />
          <DataRow label='Peças por Unidade' value={product.piecesPerUnit} />
          <DataRow label='Tamanho' value={product.size} />
          <DataRow label='S/Carga (kg/m2)' value={product.loadCapacity} />
          <DataRow label='Beta' value={product.beta} />
          <DataRow label='FCK (MPa)' value={product.fckMpa} />
        </div>
      </div>
    </div>
  );
}
