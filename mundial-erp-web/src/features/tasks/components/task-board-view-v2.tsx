'use client';

import { useState } from 'react';
import { cn } from '@/lib/cn';
import * as Badge from '@/components/ui/badge';
import { RiEyeLine, RiEyeOffLine } from '@remixicon/react';
import { useTasksGrouped } from '@/features/tasks/hooks/use-tasks-grouped';
import { useTasksRealtime } from '@/features/tasks/hooks/use-tasks-realtime';
import { TaskCard } from './task-card-v2';
import type { TasksGroupedItem } from '../services/tasks.service';

function columnBorderColor(label: TasksGroupedItem['group']['label']): string {
  const map: Record<TasksGroupedItem['group']['label'], string> = {
    NOT_STARTED: 'border-t-gray-400',
    ACTIVE: 'border-t-blue-400',
    DONE: 'border-t-green-400',
    CLOSED: 'border-t-purple-400',
  };
  return map[label] ?? 'border-t-gray-400';
}

function BoardColumn({ entry }: { entry: TasksGroupedItem }) {
  return (
    <div className='flex min-w-[300px] flex-1 flex-col'>
      <div
        className={cn(
          'mb-3 flex items-center gap-2 rounded-t-lg border-t-4 bg-bg-weak-50 px-3 py-2',
          columnBorderColor(entry.group.label),
        )}
      >
        <span
          className='size-2.5 rounded-full'
          style={{ backgroundColor: entry.group.color }}
        />
        <span className='text-label-sm text-text-strong-950'>
          {entry.group.name}
        </span>
        <Badge.Root color='gray' variant='lighter' size='small'>
          {entry.tasks.length}
        </Badge.Root>
      </div>

      <div className='flex flex-col gap-2'>
        {entry.tasks.length === 0 ? (
          <div className='flex items-center justify-center rounded-lg border border-dashed border-stroke-soft-200 px-3 py-8 text-paragraph-sm text-text-soft-400'>
            Nenhum item
          </div>
        ) : (
          entry.tasks.map((task) => <TaskCard key={task.id} task={task} />)
        )}
      </div>
    </div>
  );
}

export function TaskBoardView({ processId }: { processId: string }) {
  const [showClosed, setShowClosed] = useState(false);
  const { data, isLoading } = useTasksGrouped(processId);
  useTasksRealtime(processId);

  if (isLoading) {
    return (
      <div className='flex gap-4 overflow-x-auto pb-4'>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className='flex min-w-[300px] flex-1 flex-col gap-2'>
            <div className='h-10 animate-pulse rounded-t-lg bg-bg-weak-50' />
            {Array.from({ length: 2 }).map((__, j) => (
              <div
                key={j}
                className='h-24 animate-pulse rounded-lg bg-bg-weak-50'
              />
            ))}
          </div>
        ))}
      </div>
    );
  }

  const entries = data ?? [];
  const visibleEntries = showClosed
    ? entries
    : entries.filter(
        (e) => e.group.label !== 'DONE' && e.group.label !== 'CLOSED',
      );
  const closedCount = entries
    .filter((e) => e.group.label === 'DONE' || e.group.label === 'CLOSED')
    .reduce((sum, e) => sum + e.tasks.length, 0);

  return (
    <div className='flex flex-col gap-4'>
      <div className='flex gap-4 overflow-x-auto pb-4'>
        {visibleEntries.map((entry) => (
          <BoardColumn key={entry.group.id} entry={entry} />
        ))}
      </div>

      {closedCount > 0 && (
        <button
          type='button'
          onClick={() => setShowClosed(!showClosed)}
          className='flex items-center gap-2 self-start rounded-lg px-3 py-2 text-paragraph-sm text-text-soft-400 transition-colors hover:bg-bg-weak-50 hover:text-text-sub-600'
        >
          {showClosed ? (
            <RiEyeOffLine className='size-4' />
          ) : (
            <RiEyeLine className='size-4' />
          )}
          {showClosed
            ? 'Ocultar concluidos/fechados'
            : `Mostrar concluidos/fechados (${closedCount})`}
        </button>
      )}
    </div>
  );
}
