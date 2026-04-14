'use client';

import Link from 'next/link';
import { RiArrowRightSLine, RiHome5Line } from '@remixicon/react';
import * as Tag from '@/components/ui/tag';
import { useProcessContextStore } from '@/stores/process-context.store';
import { cn } from '@/lib/cn';

export function ProcessContextBar() {
  const { breadcrumbs, processName, steps, currentStep, entityTag } =
    useProcessContextStore();

  const hasBreadcrumbs = breadcrumbs.length > 0;
  const hasProcess = processName && steps.length > 0;

  if (!hasBreadcrumbs && !hasProcess) return null;

  return (
    <div className='flex items-center gap-4 overflow-x-auto border-b border-stroke-soft-200 bg-bg-white-0 px-4 py-2.5 lg:px-6'>
      {/* Breadcrumbs */}
      {hasBreadcrumbs && (
        <nav className='flex items-center gap-1 text-paragraph-sm'>
          <Link
            href='/inicio'
            className='text-text-soft-400 transition-colors hover:text-text-strong-950'
          >
            <RiHome5Line className='size-4' />
          </Link>
          {breadcrumbs.map((crumb, i) => (
            <span key={crumb.label} className='flex items-center gap-1'>
              <RiArrowRightSLine className='size-4 text-text-disabled-300' />
              {crumb.href && i < breadcrumbs.length - 1 ? (
                <Link
                  href={crumb.href}
                  className='text-text-soft-400 transition-colors hover:text-text-strong-950'
                >
                  {crumb.label}
                </Link>
              ) : (
                <span className='text-text-strong-950'>{crumb.label}</span>
              )}
            </span>
          ))}
        </nav>
      )}

      {/* Divider */}
      {hasBreadcrumbs && hasProcess && (
        <div className='h-5 w-px bg-stroke-soft-200' />
      )}

      {/* Step Indicator */}
      {hasProcess && (
        <div className='flex items-center gap-3'>
          <span className='text-label-xs text-text-sub-600'>
            {processName}
          </span>
          <div className='flex items-center gap-1'>
            {steps.map((step) => (
              <div
                key={step.id}
                className={cn(
                  'flex items-center gap-1.5 rounded-full px-2 py-0.5 text-label-xs',
                  step.id === currentStep
                    ? 'bg-primary-alpha-10 text-primary-base'
                    : step.status === 'completed'
                      ? 'text-success-base'
                      : 'text-text-disabled-300',
                )}
              >
                <span
                  className={cn(
                    'size-1.5 rounded-full',
                    step.id === currentStep
                      ? 'bg-primary-base'
                      : step.status === 'completed'
                        ? 'bg-success-base'
                        : 'bg-text-disabled-300',
                  )}
                />
                {step.label}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Entity Tag */}
      {entityTag && (
        <>
          <div className='h-5 w-px bg-stroke-soft-200' />
          <Tag.Root variant='stroke'>
            {entityTag}
          </Tag.Root>
        </>
      )}
    </div>
  );
}
