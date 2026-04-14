'use client';

import {
  RiArrowRightCircleLine,
  RiMailCheckLine,
  RiCheckboxCircleLine,
  RiShoppingCart2Line,
  RiInformationLine,
  RiTimeLine,
} from '@remixicon/react';
import { useQuotationTimeline } from '../../hooks/use-quotations';
import { formatDateTime } from '@/lib/formatters';
import type { QuotationTimelineEvent } from '../../types/quotation.types';
import type { ComponentType } from 'react';

const EVENT_ICON_MAP: Record<
  QuotationTimelineEvent['type'],
  { icon: ComponentType<{ className?: string }>; color: string }
> = {
  status_change: { icon: RiArrowRightCircleLine, color: 'text-primary-base' },
  proposal_received: { icon: RiMailCheckLine, color: 'text-state-information-base' },
  selected: { icon: RiCheckboxCircleLine, color: 'text-state-success-base' },
  order_created: { icon: RiShoppingCart2Line, color: 'text-state-success-base' },
};

type Props = {
  quotationId: string;
};

export function TimelineTab({ quotationId }: Props) {
  const { data: events, isLoading } = useQuotationTimeline(quotationId);

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
        <RiTimeLine className='size-8' />
        <p className='text-paragraph-sm'>Nenhum evento registrado</p>
      </div>
    );
  }

  return (
    <div className='relative flex flex-col gap-0'>
      {/* Timeline line */}
      <div className='absolute bottom-2 left-4 top-2 w-px bg-stroke-soft-200' />

      {events.map((event) => {
        const config = EVENT_ICON_MAP[event.type] ?? {
          icon: RiInformationLine,
          color: 'text-text-sub-600',
        };
        const IconComp = config.icon;

        return (
          <div key={event.id} className='relative flex gap-3 pb-6'>
            {/* Icon */}
            <div
              className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-stroke-soft-200 bg-bg-white-0 ${config.color}`}
            >
              <IconComp className='size-4' />
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
