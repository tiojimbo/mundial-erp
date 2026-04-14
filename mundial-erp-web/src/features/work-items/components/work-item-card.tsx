'use client';

import { cn } from '@/lib/cn';
import { formatDate } from '@/lib/formatters';
import type { WorkItem } from '../types/work-item.types';

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();
}

function isOverdue(dueDate: string): boolean {
  return new Date(dueDate) < new Date();
}

export function WorkItemCard({
  item,
  onClick,
}: {
  item: WorkItem;
  onClick?: () => void;
}) {
  const overdue = item.dueDate && !item.completedAt && isOverdue(item.dueDate);

  return (
    <button
      type='button'
      onClick={onClick}
      className='block w-full rounded-lg border border-stroke-soft-200 bg-bg-white-0 p-3 text-left shadow-sm transition-shadow hover:shadow-md'
    >
      <p className='truncate text-paragraph-sm text-text-strong-950'>
        {item.title}
      </p>

      <div className='mt-2 flex items-center justify-between'>
        {/* Assignee avatar */}
        {item.assigneeName ? (
          <span className='flex size-6 items-center justify-center rounded-full bg-feature-lighter text-[9px] font-semibold text-feature-base'>
            {getInitials(item.assigneeName)}
          </span>
        ) : (
          <span />
        )}

        {/* Due date */}
        {item.dueDate && (
          <span
            className={cn(
              'flex items-center gap-1 text-paragraph-xs',
              overdue ? 'text-error-base' : 'text-text-soft-400',
            )}
          >
            <i className='ri-calendar-line' />
            {formatDate(item.dueDate)}
          </span>
        )}
      </div>
    </button>
  );
}
