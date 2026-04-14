'use client';

import { useState } from 'react';
import { cn } from '@/lib/cn';
import * as Badge from '@/components/ui/badge';
import { RiEyeLine, RiEyeOffLine } from '@remixicon/react';
import { useWorkItemsGrouped } from '../hooks/use-work-items';
import { WorkItemCard } from './work-item-card';
import type { WorkItemGroup } from '../types/work-item.types';

/**
 * Map status category to border-t color class.
 * Falls back to a neutral gray if the status color cannot be mapped.
 */
function columnBorderColor(category: WorkItemGroup['category']): string {
  const map: Record<WorkItemGroup['category'], string> = {
    NOT_STARTED: 'border-t-gray-400',
    ACTIVE: 'border-t-blue-400',
    DONE: 'border-t-green-400',
    CLOSED: 'border-t-purple-400',
  };
  return map[category] ?? 'border-t-gray-400';
}

function BoardColumn({ group }: { group: WorkItemGroup }) {
  return (
    <div className='flex min-w-[300px] flex-1 flex-col'>
      {/* Column header */}
      <div
        className={cn(
          'mb-3 flex items-center gap-2 rounded-t-lg border-t-4 bg-bg-weak-50 px-3 py-2',
          columnBorderColor(group.category),
        )}
      >
        <span
          className='size-2.5 rounded-full'
          style={{ backgroundColor: group.statusColor }}
        />
        <span className='text-label-sm text-text-strong-950'>
          {group.statusName}
        </span>
        <Badge.Root color='gray' variant='lighter' size='small'>
          {group.count}
        </Badge.Root>
      </div>

      {/* Column body */}
      <div className='flex flex-col gap-2'>
        {group.items.length === 0 ? (
          <div className='flex items-center justify-center rounded-lg border border-dashed border-stroke-soft-200 px-3 py-8 text-paragraph-sm text-text-soft-400'>
            Nenhum item
          </div>
        ) : (
          group.items.map((item) => (
            <WorkItemCard key={item.id} item={item} />
          ))
        )}
      </div>
    </div>
  );
}

export function WorkItemBoardView({
  processId,
  departmentId,
}: {
  processId: string;
  departmentId: string;
}) {
  const [showClosed, setShowClosed] = useState(false);
  const { data, isLoading } = useWorkItemsGrouped(processId, 'status');

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

  const groups = data?.groups ?? [];
  const visibleGroups = showClosed
    ? groups
    : groups.filter(
        (g) => g.category !== 'DONE' && g.category !== 'CLOSED',
      );
  const closedCount = groups
    .filter((g) => g.category === 'DONE' || g.category === 'CLOSED')
    .reduce((sum, g) => sum + g.count, 0);

  return (
    <div className='flex flex-col gap-4'>
      {/* Board columns */}
      <div className='flex gap-4 overflow-x-auto pb-4'>
        {visibleGroups.map((group) => (
          <BoardColumn key={group.statusId} group={group} />
        ))}
      </div>

      {/* Toggle closed */}
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
