'use client';

import { cn } from '@/lib/cn';
import { formatDate } from '@/lib/formatters';
import type { Task } from '../types/task.types';

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

export function TaskCard({
  task,
  onClick,
}: {
  task: Task;
  onClick?: () => void;
}) {
  const overdue = task.dueDate && !task.completedAt && isOverdue(task.dueDate);

  return (
    <button
      type='button'
      onClick={onClick}
      className='shadow-sm hover:shadow-md block w-full rounded-lg border border-stroke-soft-200 bg-bg-white-0 p-3 text-left transition-shadow'
    >
      <p className='truncate text-paragraph-sm text-text-strong-950'>
        {task.title}
      </p>

      <div className='mt-2 flex items-center justify-between'>
        {task.primaryAssigneeName ? (
          <span className='flex size-6 items-center justify-center rounded-full bg-feature-lighter text-[9px] font-semibold text-feature-base'>
            {getInitials(task.primaryAssigneeName)}
          </span>
        ) : (
          <span />
        )}

        {task.dueDate && (
          <span
            className={cn(
              'flex items-center gap-1 text-paragraph-xs',
              overdue ? 'text-error-base' : 'text-text-soft-400',
            )}
          >
            <i className='ri-calendar-line' />
            {formatDate(task.dueDate)}
          </span>
        )}
      </div>
    </button>
  );
}
