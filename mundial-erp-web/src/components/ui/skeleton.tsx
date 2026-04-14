import { cn } from '@/lib/cn';

type SkeletonVariant = 'text' | 'block' | 'circle' | 'table-row';

type SkeletonProps = {
  variant?: SkeletonVariant;
  className?: string;
  width?: string;
  height?: string;
  rows?: number;
  cols?: number;
};

export function Skeleton({
  variant = 'text',
  className,
  width,
  height,
}: Omit<SkeletonProps, 'rows' | 'cols'>) {
  const baseClasses = 'animate-pulse rounded bg-bg-weak-50';

  const variantClasses: Record<SkeletonVariant, string> = {
    text: 'h-4 w-full',
    block: 'h-20 w-full',
    circle: 'h-10 w-10 rounded-full',
    'table-row': 'h-4 w-24',
  };

  return (
    <div
      className={cn(baseClasses, variantClasses[variant], className)}
      style={{ width, height }}
    />
  );
}

export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          variant='text'
          className={i === lines - 1 ? 'w-2/3' : undefined}
        />
      ))}
    </div>
  );
}
