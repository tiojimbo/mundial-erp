import { type ReactNode } from 'react';
import { cn } from '@/lib/cn';

type EmptyStateProps = {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
};

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-16 text-center',
        className,
      )}
    >
      {icon && (
        <div className='mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-bg-weak-50 text-text-soft-400'>
          {icon}
        </div>
      )}
      <h3 className='text-label-md text-text-strong-950'>{title}</h3>
      {description && (
        <p className='mt-1 max-w-sm text-paragraph-sm text-text-sub-600'>
          {description}
        </p>
      )}
      {action && <div className='mt-4'>{action}</div>}
    </div>
  );
}
