'use client';

import { formatCents } from '@/lib/formatters';
import type { ProductionOrder } from '../../types/production.types';

type Props = {
  order: ProductionOrder;
};

export function CostsTab({ order }: Props) {
  const consumptions = order.consumptions ?? [];
  const losses = order.losses ?? [];

  const materiaCost = consumptions.reduce((acc, c) => acc + c.totalCostCents, 0);
  const lossCost = losses.reduce((acc, l) => acc + (l.costCents ?? 0), 0);
  const totalCost = materiaCost + lossCost;

  return (
    <div className='flex flex-col gap-6'>
      {/* Cost summary cards */}
      <div className='grid grid-cols-1 gap-4 sm:grid-cols-3'>
        <div className='rounded-lg border border-stroke-soft-200 p-4'>
          <div className='flex items-center gap-2'>
            <i className='ri-flask-line text-lg text-text-sub-600' />
            <span className='text-subheading-2xs uppercase text-text-soft-400'>
              Materia-Prima
            </span>
          </div>
          <p className='mt-1 text-title-h5 text-text-strong-950'>
            {formatCents(materiaCost)}
          </p>
          <p className='text-paragraph-xs text-text-sub-600'>
            {consumptions.length} ingrediente(s)
          </p>
        </div>

        <div className='rounded-lg border border-stroke-soft-200 p-4'>
          <div className='flex items-center gap-2'>
            <i className='ri-error-warning-line text-lg text-state-error-base' />
            <span className='text-subheading-2xs uppercase text-text-soft-400'>
              Perdas
            </span>
          </div>
          <p className='mt-1 text-title-h5 text-state-error-base'>
            {formatCents(lossCost)}
          </p>
          <p className='text-paragraph-xs text-text-sub-600'>
            {losses.length} registro(s)
          </p>
        </div>

        <div className='rounded-lg border-2 border-primary-base p-4'>
          <div className='flex items-center gap-2'>
            <i className='ri-money-dollar-circle-line text-lg text-primary-base' />
            <span className='text-subheading-2xs uppercase text-primary-base'>
              Custo Total
            </span>
          </div>
          <p className='mt-1 text-title-h5 text-text-strong-950'>
            {formatCents(totalCost)}
          </p>
        </div>
      </div>

      {/* Cost breakdown */}
      {consumptions.length > 0 && (
        <section>
          <h4 className='mb-3 text-label-sm text-text-strong-950'>
            Detalhamento por Ingrediente
          </h4>
          <div className='flex flex-col gap-2'>
            {consumptions.map((c) => {
              const percentage = totalCost > 0 ? (c.totalCostCents / totalCost) * 100 : 0;
              return (
                <div
                  key={c.id}
                  className='flex items-center justify-between rounded-lg border border-stroke-soft-200 px-3 py-2'
                >
                  <div className='flex items-center gap-2'>
                    <span className='text-paragraph-sm text-text-strong-950'>
                      {c.ingredient?.name ?? 'Ingrediente'}
                    </span>
                    <span className='text-paragraph-xs text-text-soft-400'>
                      {c.ingredient?.code}
                    </span>
                  </div>
                  <div className='flex items-center gap-3'>
                    <div className='h-2 w-24 overflow-hidden rounded-full bg-bg-weak-50'>
                      <div
                        className='h-full rounded-full bg-primary-base'
                        style={{ width: `${Math.min(percentage, 100)}%` }}
                      />
                    </div>
                    <span className='min-w-[60px] text-right text-paragraph-sm font-medium'>
                      {formatCents(c.totalCostCents)}
                    </span>
                    <span className='min-w-[45px] text-right text-paragraph-xs text-text-soft-400'>
                      {percentage.toFixed(1)}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
