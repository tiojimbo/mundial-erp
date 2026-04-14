'use client';

import Link from 'next/link';
import {
  RiTimeLine,
  RiCheckboxCircleLine,
  RiArrowRightSLine,
} from '@remixicon/react';
import * as Badge from '@/components/ui/badge';
import * as ProgressBar from '@/components/ui/progress-bar';
import type { ActivityInstance } from '../types/home.types';

type ActivityCardProps = {
  activity: ActivityInstance;
};

function formatSlaRemaining(minutes: number): string {
  if (minutes <= 0) return 'Atrasado';
  if (minutes < 60) return `${minutes}min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
}

function getSlaColor(
  minutes: number,
): 'red' | 'orange' | 'green' {
  if (minutes <= 0) return 'red';
  if (minutes <= 60) return 'orange';
  return 'green';
}

function getStatusBadge(status: ActivityInstance['status']) {
  switch (status) {
    case 'IN_PROGRESS':
      return { label: 'Em andamento', color: 'blue' as const };
    case 'PENDING':
      return { label: 'Pendente', color: 'orange' as const };
    default:
      return { label: status, color: 'gray' as const };
  }
}

export function ActivityCard({ activity }: ActivityCardProps) {
  const slaColor = getSlaColor(activity.slaRemainingMinutes);
  const statusBadge = getStatusBadge(activity.status);
  const checklistProgress =
    activity.checklistTotal > 0
      ? Math.round(
          (activity.checklistCompleted / activity.checklistTotal) * 100,
        )
      : 0;

  return (
    <Link
      href={`/comercial/pedidos/${activity.orderId}`}
      className='group block rounded-xl border border-stroke-soft-200 bg-bg-white-0 p-4 shadow-regular-xs transition duration-200 hover:border-stroke-strong-950/10 hover:shadow-regular-sm'
    >
      <div className='flex items-start justify-between gap-3'>
        <div className='min-w-0 flex-1'>
          <p className='truncate text-label-sm text-text-strong-950'>
            {activity.activityName}
          </p>
          <p className='mt-0.5 truncate text-paragraph-xs text-text-sub-600'>
            {activity.processName} &middot; {activity.orderCode}
          </p>
        </div>
        <Badge.Root variant='light' color={statusBadge.color} size='small'>
          {statusBadge.label}
        </Badge.Root>
      </div>

      <p className='mt-2 truncate text-paragraph-xs text-text-soft-400'>
        {activity.clientName}
      </p>

      <div className='mt-3 flex items-center gap-4'>
        <div className='flex items-center gap-1.5'>
          <RiTimeLine
            className={`size-4 ${slaColor === 'red' ? 'text-error-base' : slaColor === 'orange' ? 'text-warning-base' : 'text-success-base'}`}
          />
          <span
            className={`text-paragraph-xs ${slaColor === 'red' ? 'text-error-base' : slaColor === 'orange' ? 'text-warning-base' : 'text-success-base'}`}
          >
            {formatSlaRemaining(activity.slaRemainingMinutes)}
          </span>
        </div>

        {activity.checklistTotal > 0 && (
          <div className='flex flex-1 items-center gap-2'>
            <RiCheckboxCircleLine className='size-4 text-text-soft-400' />
            <ProgressBar.Root value={checklistProgress} className='flex-1' />
            <span className='text-paragraph-xs text-text-soft-400'>
              {activity.checklistCompleted}/{activity.checklistTotal}
            </span>
          </div>
        )}
      </div>

      <div className='mt-2 flex items-center justify-end'>
        <span className='flex items-center text-paragraph-xs text-text-soft-400 transition group-hover:text-primary-base'>
          Abrir dossiê
          <RiArrowRightSLine className='size-4' />
        </span>
      </div>
    </Link>
  );
}
