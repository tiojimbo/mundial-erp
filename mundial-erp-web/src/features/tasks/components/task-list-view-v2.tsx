'use client';

import { useState } from 'react';
import { cn } from '@/lib/cn';
import { formatDate } from '@/lib/formatters';
import * as Table from '@/components/ui/table';
import * as Badge from '@/components/ui/badge';
import { RiArrowDownSLine, RiEyeLine, RiEyeOffLine } from '@remixicon/react';
import { useTasksGrouped } from '@/features/tasks/hooks/use-tasks-grouped';
import { useListSse } from '@/features/tasks/hooks/use-list-sse';
import { StatusIcon } from '@/features/processes/components/status-icon';
import { StatusIconPopover } from '@/features/processes/components/status-icon-popover';
import type { Task } from '../types/task.types';
import type { TasksGroupedItem } from '../services/tasks.service';

const SSE_ENABLED = process.env.NEXT_PUBLIC_TASKS_SSE_ENABLED !== 'false';

function isOverdue(dueDate: string): boolean {
  return new Date(dueDate) < new Date();
}

function PriorityBadge({ priority }: { priority: Task['priority'] }) {
  const colorMap: Record<
    Task['priority'],
    'red' | 'orange' | 'blue' | 'gray' | 'green'
  > = {
    URGENT: 'red',
    HIGH: 'orange',
    NORMAL: 'blue',
    LOW: 'gray',
    NONE: 'gray',
  };
  const labelMap: Record<Task['priority'], string> = {
    URGENT: 'Urgente',
    HIGH: 'Alta',
    NORMAL: 'Normal',
    LOW: 'Baixa',
    NONE: 'Nenhuma',
  };

  if (priority === 'NONE') return null;

  return (
    <Badge.Root variant='lighter' color={colorMap[priority]} size='small'>
      {labelMap[priority]}
    </Badge.Root>
  );
}

function GroupSection({
  entry,
  defaultExpanded,
  listId,
}: {
  entry: TasksGroupedItem;
  defaultExpanded: boolean;
  listId: string;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <div className='mb-4'>
      <button
        type='button'
        onClick={() => setExpanded(!expanded)}
        className='flex w-full items-center gap-2 rounded-lg px-3 py-2 transition-colors hover:bg-bg-weak-50'
      >
        <RiArrowDownSLine
          className={cn(
            'size-4 shrink-0 text-text-soft-400 transition-transform duration-150',
            expanded ? 'rotate-0' : '-rotate-90',
          )}
        />
        <StatusIcon
          type={entry.group.label}
          color={entry.group.color}
          size={14}
        />
        <span className='text-label-sm text-text-strong-950'>
          {entry.group.name}
        </span>
        <Badge.Root color='gray' variant='lighter' size='small'>
          {entry.tasks.length}
        </Badge.Root>
      </button>

      {expanded && (
        <div className='pl-6'>
          <Table.Root>
            <Table.Header>
              <Table.Row>
                <Table.Head>Titulo</Table.Head>
                <Table.Head>Responsavel</Table.Head>
                <Table.Head>Prioridade</Table.Head>
                <Table.Head>Prazo</Table.Head>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {entry.tasks.length === 0 ? (
                <Table.Row>
                  <Table.Cell colSpan={4} className='text-center'>
                    <p className='py-4 text-paragraph-sm text-text-soft-400'>
                      Nenhum item neste status.
                    </p>
                  </Table.Cell>
                </Table.Row>
              ) : (
                entry.tasks.map((task) => {
                  const overdue =
                    task.dueDate &&
                    !task.completedAt &&
                    isOverdue(task.dueDate);
                  return (
                    <Table.Row key={task.id}>
                      <Table.Cell>
                        <div className='flex items-center gap-2'>
                          <StatusIconPopover
                            taskId={task.id}
                            listId={listId}
                            currentStatusId={task.statusId}
                            currentType={entry.group.label}
                            currentColor={entry.group.color}
                            size={12}
                          />
                          <span className='text-label-sm text-text-strong-950'>
                            {task.title}
                          </span>
                        </div>
                      </Table.Cell>
                      <Table.Cell>
                        <span className='text-paragraph-sm text-text-sub-600'>
                          {task.primaryAssigneeName ?? '—'}
                        </span>
                      </Table.Cell>
                      <Table.Cell>
                        <PriorityBadge priority={task.priority} />
                      </Table.Cell>
                      <Table.Cell>
                        {task.dueDate ? (
                          <span
                            className={cn(
                              'text-paragraph-sm',
                              overdue
                                ? 'font-medium text-error-base'
                                : 'text-text-sub-600',
                            )}
                          >
                            {formatDate(task.dueDate)}
                          </span>
                        ) : (
                          <span className='text-paragraph-sm text-text-soft-400'>
                            —
                          </span>
                        )}
                      </Table.Cell>
                    </Table.Row>
                  );
                })
              )}
            </Table.Body>
          </Table.Root>
        </div>
      )}
    </div>
  );
}

export function TaskListView({ processId }: { processId: string }) {
  const [showClosed, setShowClosed] = useState(false);
  const { data, isLoading } = useTasksGrouped(processId);
  useListSse(processId, { enabled: SSE_ENABLED });

  if (isLoading) {
    return (
      <div className='flex flex-col gap-4'>
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className='h-20 animate-pulse rounded-lg bg-bg-weak-50'
          />
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
    <div className='flex flex-col gap-2'>
      {visibleEntries.map((entry) => (
        <GroupSection
          key={entry.group.id}
          entry={entry}
          defaultExpanded={
            entry.group.label === 'NOT_STARTED' ||
            entry.group.label === 'ACTIVE'
          }
          listId={processId}
        />
      ))}

      {closedCount > 0 && (
        <button
          type='button'
          onClick={() => setShowClosed(!showClosed)}
          className='flex items-center gap-2 rounded-lg px-3 py-2 text-paragraph-sm text-text-soft-400 transition-colors hover:bg-bg-weak-50 hover:text-text-sub-600'
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
