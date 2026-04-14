'use client';

import * as Breadcrumb from '@/components/ui/breadcrumb';
import type { ProcessInstance, ActivityInstance } from '../types/order.types';

type Props = {
  processInstances: ProcessInstance[];
};

function getActiveActivity(processInstances: ProcessInstance[]): {
  department: string;
  process: string;
  activity: string;
  slaMinutes: number | null;
  startedAt: string | null;
} | null {
  for (const pi of processInstances) {
    if (pi.status === 'COMPLETED' || pi.status === 'CANCELLED') continue;
    const active = pi.activityInstances.find(
      (ai: ActivityInstance) => ai.status === 'IN_PROGRESS',
    );
    if (active) {
      return {
        department: pi.process?.name ?? 'Processo',
        process: pi.process?.slug ?? '',
        activity: active.activity?.name ?? 'Atividade',
        slaMinutes: active.activity?.slaMinutes ?? null,
        startedAt: active.startedAt,
      };
    }
  }
  return null;
}

function formatSlaRemaining(slaMinutes: number | null, startedAt: string | null): string | null {
  if (!slaMinutes || !startedAt) return null;
  const elapsed = (Date.now() - new Date(startedAt).getTime()) / 60000;
  const remaining = Math.round(slaMinutes - elapsed);
  if (remaining <= 0) return 'SLA expirado';
  if (remaining < 60) return `${remaining}min restantes`;
  const hours = Math.floor(remaining / 60);
  const mins = remaining % 60;
  return `${hours}h${mins > 0 ? `${mins}min` : ''} restantes`;
}

export function ProcessContextBar({ processInstances }: Props) {
  const context = getActiveActivity(processInstances);

  if (!context) {
    return (
      <div className='flex items-center gap-3 rounded-lg border border-stroke-soft-200 bg-bg-white-0 px-4 py-2.5'>
        <i className='ri-flow-chart text-lg text-text-sub-600' />
        <span className='text-paragraph-sm text-text-sub-600'>
          Nenhuma atividade em andamento
        </span>
      </div>
    );
  }

  const slaText = formatSlaRemaining(context.slaMinutes, context.startedAt);
  const isExpired = slaText === 'SLA expirado';

  return (
    <div className='flex items-center justify-between rounded-lg border border-stroke-soft-200 bg-bg-white-0 px-4 py-2.5'>
      <div className='flex items-center gap-3'>
        <i className='ri-flow-chart text-lg text-primary-base' />
        <Breadcrumb.Root>
          <Breadcrumb.Item>{context.department}</Breadcrumb.Item>
          <Breadcrumb.ArrowIcon as='i' className='ri-arrow-right-s-line' />
          <Breadcrumb.Item active>{context.activity}</Breadcrumb.Item>
        </Breadcrumb.Root>
      </div>

      {slaText && (
        <div className={`flex items-center gap-1.5 text-label-xs ${isExpired ? 'text-state-error-base' : 'text-text-sub-600'}`}>
          <i className={`ri-timer-line ${isExpired ? 'text-state-error-base' : ''}`} />
          {slaText}
        </div>
      )}
    </div>
  );
}
