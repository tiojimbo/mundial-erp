'use client';

import type { ProductionOrderStatus } from '../types/production.types';
import { PO_STATUS_LABELS, PO_STATUS_STEPS } from '../types/production.types';

type Props = {
  currentStatus: ProductionOrderStatus;
};

const STEP_CONFIG: Record<
  ProductionOrderStatus,
  { icon: string; activeColor: string }
> = {
  PENDING: { icon: 'ri-time-line', activeColor: 'bg-orange-500' },
  IN_PROGRESS: { icon: 'ri-hammer-line', activeColor: 'bg-purple-500' },
  COMPLETED: { icon: 'ri-checkbox-circle-line', activeColor: 'bg-green-500' },
  CANCELLED: { icon: 'ri-close-circle-line', activeColor: 'bg-red-500' },
};

export function POStatusStepper({ currentStatus }: Props) {
  if (currentStatus === 'CANCELLED') {
    return (
      <div className='flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3'>
        <i className='ri-close-circle-line text-xl text-state-error-base' />
        <span className='text-label-sm text-state-error-base'>
          Ordem de producao cancelada
        </span>
      </div>
    );
  }

  const currentIndex = PO_STATUS_STEPS.indexOf(currentStatus);

  return (
    <div className='flex items-center gap-0'>
      {PO_STATUS_STEPS.map((step, idx) => {
        const config = STEP_CONFIG[step];
        const isCompleted = idx < currentIndex;
        const isCurrent = idx === currentIndex;

        return (
          <div key={step} className='flex flex-1 items-center'>
            <div className='flex flex-col items-center gap-1'>
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
                  isCompleted
                    ? 'bg-green-500 text-white'
                    : isCurrent
                      ? `${config.activeColor} text-white`
                      : 'bg-bg-weak-50 text-text-soft-400'
                }`}
              >
                {isCompleted ? (
                  <i className='ri-check-line text-sm' />
                ) : (
                  <i className={`${config.icon} text-sm`} />
                )}
              </div>
              <span
                className={`text-center text-paragraph-xs ${
                  isCurrent
                    ? 'font-medium text-text-strong-950'
                    : isCompleted
                      ? 'text-text-sub-600'
                      : 'text-text-soft-400'
                }`}
              >
                {PO_STATUS_LABELS[step]}
              </span>
            </div>
            {idx < PO_STATUS_STEPS.length - 1 && (
              <div
                className={`mx-2 h-0.5 flex-1 ${
                  isCompleted ? 'bg-green-500' : 'bg-stroke-soft-200'
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
