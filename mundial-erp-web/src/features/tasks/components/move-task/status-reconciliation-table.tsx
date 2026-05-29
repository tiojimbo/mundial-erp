'use client';

import * as React from 'react';
import { RiArrowRightLine, RiArrowDownSLine } from '@remixicon/react';
import { cn } from '@/lib/cn';
import * as Popover from '@/components/ui/popover';
import type { TaskStatus } from '../../types/task.types';
import type { StatusDiff } from '../../services/move-task.service';

function StatusPill({
  name,
  color,
  muted,
}: {
  name: string;
  color?: string;
  muted?: boolean;
}) {
  return (
    <span
      className={cn(
        'inline-flex h-[22px] items-center rounded-[4px] px-2 text-[11px] font-medium uppercase tracking-wide',
        muted ? 'text-text-soft-400' : 'text-white',
      )}
      style={muted ? undefined : { backgroundColor: color || '#94a3b8' }}
    >
      {name}
    </span>
  );
}

function TargetPicker({
  value,
  options,
  onChange,
}: {
  value: string | null;
  options: TaskStatus[];
  onChange: (statusId: string) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const current = options.find((s) => s.id === value) ?? null;

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type='button'
          className={cn(
            'inline-flex items-center gap-1 rounded-[4px] border px-1.5 py-0.5',
            current
              ? 'border-stroke-soft-200'
              : 'border-red-300 bg-red-50 text-red-600',
          )}
        >
          {current ? (
            <StatusPill name={current.name} color={current.color} />
          ) : (
            <span className='px-1 text-[11px] font-medium uppercase tracking-wide'>
              Escolher
            </span>
          )}
          <RiArrowDownSLine className='size-3.5 text-text-soft-400' />
        </button>
      </Popover.Trigger>
      <Popover.Content align='end' sideOffset={4} className='min-w-[200px] p-1'>
        {options.map((s) => (
          <button
            key={s.id}
            type='button'
            onClick={() => {
              onChange(s.id);
              setOpen(false);
            }}
            className='flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 hover:bg-bg-weak-50'
          >
            <span
              className='size-2.5 shrink-0 rounded-full'
              style={{ backgroundColor: s.color || '#94a3b8' }}
            />
            <span className='truncate text-[12px] uppercase tracking-wide text-text-strong-950'>
              {s.name}
            </span>
          </button>
        ))}
      </Popover.Content>
    </Popover.Root>
  );
}

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
  return (
    <div className='flex flex-col gap-1'>
      {statusDiffs.map((d) => {
        const resolved = mapping[d.sourceStatusId] ?? d.autoTargetStatusId;
        return (
          <div
            key={d.sourceStatusId}
            className='flex items-center justify-between gap-3 rounded-md px-1 py-1'
          >
            <div className='flex items-center gap-2'>
              <StatusPill name={d.sourceName} muted />
              <span className='text-[11px] text-text-soft-400'>
                {d.taskCount}
              </span>
            </div>
            <RiArrowRightLine className='size-4 shrink-0 text-text-soft-400' />
            <TargetPicker
              value={resolved}
              options={targetStatuses}
              onChange={(statusId) => onChange(d.sourceStatusId, statusId)}
            />
          </div>
        );
      })}
    </div>
  );
}
