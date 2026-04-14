'use client';

import { useOrderTimeline } from '../../hooks/use-orders';
import { formatDateTime } from '../../lib/format';
import type { TimelineEvent } from '../../types/order.types';

const EVENT_ICON_MAP: Record<TimelineEvent['type'], { icon: string; color: string }> = {
  status_change: { icon: 'ri-arrow-right-circle-line', color: 'text-primary-base' },
  activity_completed: { icon: 'ri-checkbox-circle-line', color: 'text-state-success-base' },
  handoff: { icon: 'ri-share-forward-line', color: 'text-state-information-base' },
  note: { icon: 'ri-sticky-note-line', color: 'text-text-sub-600' },
  payment: { icon: 'ri-money-dollar-circle-line', color: 'text-state-success-base' },
  supply_ready: { icon: 'ri-check-double-line', color: 'text-state-success-base' },
};

type Props = {
  orderId: string;
};

export function TimelineTab({ orderId }: Props) {
  const { data: events, isLoading } = useOrderTimeline(orderId);

  if (isLoading) {
    return (
      <div className='flex flex-col gap-4 py-4'>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className='flex gap-3'>
            <div className='h-8 w-8 animate-pulse rounded-full bg-bg-weak-50' />
            <div className='flex-1'>
              <div className='h-4 w-3/4 animate-pulse rounded bg-bg-weak-50' />
              <div className='mt-1 h-3 w-1/3 animate-pulse rounded bg-bg-weak-50' />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!events || events.length === 0) {
    return (
      <div className='flex flex-col items-center justify-center gap-2 py-12 text-text-soft-400'>
        <i className='ri-time-line text-3xl' />
        <p className='text-paragraph-sm'>Nenhum evento registrado</p>
      </div>
    );
  }

  return (
    <div className='relative flex flex-col gap-0'>
      {/* Timeline line */}
      <div className='absolute left-4 top-2 bottom-2 w-px bg-stroke-soft-200' />

      {events.map((event) => {
        const config = EVENT_ICON_MAP[event.type] ?? {
          icon: 'ri-information-line',
          color: 'text-text-sub-600',
        };

        return (
          <div key={event.id} className='relative flex gap-3 pb-6'>
            {/* Icon */}
            <div className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-bg-white-0 border border-stroke-soft-200 ${config.color}`}>
              <i className={`${config.icon} text-base`} />
            </div>

            {/* Content */}
            <div className='flex flex-1 flex-col gap-0.5 pt-1'>
              <p className='text-paragraph-sm text-text-strong-950'>
                {event.description}
              </p>
              <div className='flex items-center gap-2 text-paragraph-xs text-text-soft-400'>
                <span>{formatDateTime(event.createdAt)}</span>
                {event.userName && (
                  <>
                    <span>·</span>
                    <span>{event.userName}</span>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
