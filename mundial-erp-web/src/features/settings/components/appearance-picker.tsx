'use client';

import { useTheme } from 'next-themes';
import { cn } from '@/lib/cn';

const APPEARANCE_OPTIONS = [
  {
    value: 'light',
    label: 'Claro',
    thumbnail: (
      <div className='flex h-full flex-col overflow-hidden rounded-lg bg-gray-100'>
        <div className='h-2 bg-gray-200' />
        <div className='flex flex-1'>
          <div className='w-4 bg-gray-200' />
          <div className='flex-1 space-y-1 p-1.5'>
            <div className='h-1.5 w-3/4 rounded-sm bg-gray-300' />
            <div className='h-1.5 w-1/2 rounded-sm bg-gray-200' />
            <div className='h-3 w-full rounded-sm bg-gray-200' />
          </div>
        </div>
      </div>
    ),
  },
  {
    value: 'dark',
    label: 'Escuro',
    thumbnail: (
      <div className='flex h-full flex-col overflow-hidden rounded-lg bg-gray-900'>
        <div className='h-2 bg-gray-800' />
        <div className='flex flex-1'>
          <div className='w-4 bg-gray-800' />
          <div className='flex-1 space-y-1 p-1.5'>
            <div className='h-1.5 w-3/4 rounded-sm bg-gray-700' />
            <div className='h-1.5 w-1/2 rounded-sm bg-gray-800' />
            <div className='h-3 w-full rounded-sm bg-gray-800' />
          </div>
        </div>
      </div>
    ),
  },
  {
    value: 'system',
    label: 'Auto',
    thumbnail: (
      <div className='flex h-full overflow-hidden rounded-lg'>
        {/* Left half - light */}
        <div className='flex w-1/2 flex-col bg-gray-100'>
          <div className='h-2 bg-gray-200' />
          <div className='flex-1 space-y-1 p-1'>
            <div className='h-1.5 w-3/4 rounded-sm bg-gray-300' />
            <div className='h-1.5 w-1/2 rounded-sm bg-gray-200' />
          </div>
        </div>
        {/* Right half - dark */}
        <div className='flex w-1/2 flex-col bg-gray-900'>
          <div className='h-2 bg-gray-800' />
          <div className='flex-1 space-y-1 p-1'>
            <div className='h-1.5 w-3/4 rounded-sm bg-gray-700' />
            <div className='h-1.5 w-1/2 rounded-sm bg-gray-800' />
          </div>
        </div>
      </div>
    ),
  },
] as const;

export function AppearancePicker() {
  const { theme, setTheme } = useTheme();

  return (
    <div className='flex gap-4'>
      {APPEARANCE_OPTIONS.map((option) => {
        const isSelected = theme === option.value;
        return (
          <button
            key={option.value}
            type='button'
            onClick={() => setTheme(option.value)}
            className='flex flex-col items-center gap-2'
          >
            <div
              className={cn(
                'h-20 w-28 overflow-hidden rounded-xl border-2 transition-colors',
                isSelected
                  ? 'border-primary-base'
                  : 'border-transparent hover:border-stroke-soft-200',
              )}
            >
              {option.thumbnail}
            </div>
            <span
              className={cn(
                'text-label-sm',
                isSelected
                  ? 'text-text-strong-950'
                  : 'text-text-sub-600',
              )}
            >
              {option.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
