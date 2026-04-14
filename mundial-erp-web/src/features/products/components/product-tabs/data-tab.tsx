'use client';

import type { Product } from '../../types/product.types';

type ProductDataTabProps = {
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

export function ProductDataTab({ product }: ProductDataTabProps) {
  return (
    <div className='space-y-6'>
      {/* Identification */}
      <div className='rounded-xl border border-stroke-soft-200 bg-bg-white-0 p-5 shadow-regular-xs'>
        <h3 className='mb-4 text-label-sm text-text-strong-950'>
          Identificação
        </h3>
        <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
          <DataRow label='Código' value={product.code} />
          <DataRow label='EAN-13' value={product.barcode} />
          <DataRow label='Descrição' value={product.name} />
          <DataRow
            label='Tipo de Produto'
            value={
              product.productType
                ? `${product.productType.prefix} — ${product.productType.name}`
                : null
            }
          />
          <DataRow
            label='Departamento'
            value={product.departmentCategory?.name}
          />
          <DataRow label='Marca' value={product.brand?.name} />
          <DataRow
            label='Unidade de Medida'
            value={product.unitMeasure?.name}
          />
          <DataRow
            label='Unidade de Caixa'
            value={product.boxUnitMeasure?.name}
          />
          <DataRow label='Unidades por Caixa' value={product.unitsPerBox} />
        </div>
      </div>

      {/* Step completion */}
      <div className='rounded-xl border border-stroke-soft-200 bg-bg-white-0 p-5 shadow-regular-xs'>
        <h3 className='mb-4 text-label-sm text-text-strong-950'>
          Progresso do Cadastro
        </h3>
        <div className='grid gap-4 sm:grid-cols-4'>
          <StepStatus label='1. Identificação' done={product.step1Complete} />
          <StepStatus label='2. Especificação' done={product.step2Complete} />
          <StepStatus label='3. Fiscal' done={product.step3Complete} />
          <StepStatus label='4. Precificação' done={product.step4Complete} />
        </div>
      </div>
    </div>
  );
}

function StepStatus({ label, done }: { label: string; done: boolean }) {
  return (
    <div className='flex items-center gap-2'>
      <div
        className={`size-3 rounded-full ${
          done ? 'bg-success-base' : 'bg-bg-soft-200'
        }`}
      />
      <span
        className={`text-paragraph-sm ${
          done ? 'text-text-strong-950' : 'text-text-soft-400'
        }`}
      >
        {label}
      </span>
    </div>
  );
}
