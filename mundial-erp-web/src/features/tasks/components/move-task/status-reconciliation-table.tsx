'use client';

import { RiArrowRightLine } from '@remixicon/react';
import * as Select from '@/components/ui/select';
import { StatusIcon } from '@/features/processes/components/status-icon';
import type { TaskStatus } from '../../types/task.types';
import type { StatusDiff } from '../../services/move-task.service';

/**
 * "Mapeamento de Status" (paridade Hoppe — tela Reconciliar Mover).
 * Lista só os status de origem sem equivalente automatico no destino; o
 * usuario escolhe o status de destino de cada um.
 */
export function StatusReconciliationTable({
  statusDiffs,
  targetStatuses,
  mapping,
  onChange,
}: {
  statusDiffs: StatusDiff[];
  targetStatuses: TaskStatus[];
  mapping: Record<string, string>;
  onChange: (sourceStatusId: string, targetStatusId: string) => void;
}) {
  const pending = statusDiffs.filter((d) => d.autoTargetStatusId === null);
  if (pending.length === 0) return null;

  return (
    <div>
      <h4 className='text-sm mb-2 font-medium text-text-strong-950'>
        Mapeamento de Status
      </h4>
      <p className='text-xs mb-3 text-text-sub-600'>
        Os status da lista de origem não existem na lista de destino. Mapeie
        cada status:
      </p>
      <div className='flex flex-col gap-2'>
        {pending.map((d) => (
          <div key={d.sourceStatusId} className='flex items-center gap-2'>
            <div className='flex min-w-[140px] items-center gap-1.5'>
              <StatusIcon type={d.sourceType} color='#8A817C' size={14} />
              <span className='text-sm truncate text-text-strong-950'>
                {d.sourceName}
              </span>
            </div>
            <RiArrowRightLine className='size-3.5 shrink-0 text-text-soft-400' />
            <Select.Root
              value={mapping[d.sourceStatusId] || undefined}
              onValueChange={(v) => onChange(d.sourceStatusId, v)}
            >
              <Select.Trigger className='h-8 flex-1'>
                <Select.Value placeholder='Selecionar status' />
              </Select.Trigger>
              <Select.Content>
                {targetStatuses.map((s) => (
                  <Select.Item key={s.id} value={s.id}>
                    <span className='flex items-center gap-2'>
                      <StatusIcon
                        type={s.type}
                        color={s.color || '#8A817C'}
                        size={12}
                      />
                      <span className='uppercase'>{s.name}</span>
                    </span>
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Root>
          </div>
        ))}
      </div>
    </div>
  );
}
