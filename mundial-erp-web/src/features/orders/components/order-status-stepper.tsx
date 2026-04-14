'use client';

import { useState } from 'react';
import * as HorizontalStepper from '@/components/ui/horizontal-stepper';
import * as Popover from '@/components/ui/popover';
import type { OrderStatus, OrderStatusHistory } from '../types/order.types';
import { ORDER_STATUS_LABELS, ORDER_STATUS_STEPS } from '../types/order.types';
import { formatDateTime } from '../lib/format';

type Props = {
  currentStatus: OrderStatus;
  statusHistory?: OrderStatusHistory[];
};

export function OrderStatusStepper({ currentStatus, statusHistory = [] }: Props) {
  const currentIndex = ORDER_STATUS_STEPS.indexOf(currentStatus);
  const isCancelled = currentStatus === 'CANCELADO';
  const [openPopover, setOpenPopover] = useState<string | null>(null);

  function getHistoryForStatus(status: OrderStatus) {
    return statusHistory.filter(
      (h) => h.toStatus === status,
    );
  }

  return (
    <div className='w-full overflow-x-auto'>
      <HorizontalStepper.Root className='min-w-[640px]'>
        {ORDER_STATUS_STEPS.map((step, index) => {
          const isCompleted = !isCancelled && index < currentIndex;
          const isActive = !isCancelled && step === currentStatus;
          const state = isCompleted ? 'completed' : isActive ? 'active' : 'default';
          const history = getHistoryForStatus(step);

          return (
            <Popover.Root
              key={step}
              open={openPopover === step}
              onOpenChange={(open) => setOpenPopover(open ? step : null)}
            >
              <Popover.Trigger asChild>
                <HorizontalStepper.Item
                  state={state as 'completed' | 'active' | 'default'}
                  disabled={isCancelled}
                  onClick={() => setOpenPopover(openPopover === step ? null : step)}
                >
                  <HorizontalStepper.ItemIndicator>
                    {index + 1}
                  </HorizontalStepper.ItemIndicator>
                  <span className='text-label-xs whitespace-nowrap'>
                    {ORDER_STATUS_LABELS[step]}
                  </span>
                  {index < ORDER_STATUS_STEPS.length - 1 && (
                    <HorizontalStepper.SeparatorIcon />
                  )}
                </HorizontalStepper.Item>
              </Popover.Trigger>

              {history.length > 0 && (
                <Popover.Content sideOffset={8} align='center' className='w-64'>
                  <div className='flex flex-col gap-2 p-3'>
                    <span className='text-label-xs text-text-strong-950'>
                      {ORDER_STATUS_LABELS[step]}
                    </span>
                    {history.map((h) => (
                      <div key={h.id} className='text-paragraph-xs text-text-sub-600'>
                        <span>{formatDateTime(h.createdAt)}</span>
                        {h.changedByUser && (
                          <span> - {h.changedByUser.name}</span>
                        )}
                        {h.reason && (
                          <p className='mt-0.5 text-text-soft-400'>{h.reason}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </Popover.Content>
              )}
            </Popover.Root>
          );
        })}
      </HorizontalStepper.Root>

      {isCancelled && (
        <div className='mt-2 flex items-center justify-center gap-2 rounded-lg bg-state-error-lighter px-3 py-1.5'>
          <i className='ri-close-circle-line text-state-error-base' />
          <span className='text-label-sm text-state-error-base'>
            Pedido Cancelado
          </span>
        </div>
      )}
    </div>
  );
}
