'use client';

import { useState } from 'react';
import { cn } from '@/lib/cn';
import { formatDate } from '@/lib/formatters';
import * as Table from '@/components/ui/table';
import * as Badge from '@/components/ui/badge';
import { RiArrowDownSLine, RiEyeLine, RiEyeOffLine } from '@remixicon/react';
import { useWorkItemsGrouped } from '../hooks/use-work-items';
import { StatusIcon } from './status-icon';
import type { WorkItem, WorkItemGroup } from '../types/work-item.types';

function isOverdue(dueDate: string): boolean {
  return new Date(dueDate) < new Date();
}

function PriorityBadge({ priority }: { priority: WorkItem['priority'] }) {
  const colorMap: Record<WorkItem['priority'], 'red' | 'orange' | 'blue' | 'gray' | 'green'> = {
    URGENT: 'red',
    HIGH: 'orange',
    NORMAL: 'blue',
    LOW: 'gray',
    NONE: 'gray',
  };
  const labelMap: Record<WorkItem['priority'], string> = {
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
  group,
  defaultExpanded,
}: {
  group: WorkItemGroup;
  defaultExpanded: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <div className='mb-4'>
      {/* Group header */}
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
          category={group.category}
          color={group.statusColor}
          size={14}
        />
        <span className='text-label-sm text-text-strong-950'>
          {group.statusName}
        </span>
        <Badge.Root color='gray' variant='lighter' size='small'>
          {group.count}
        </Badge.Root>
      </button>

      {/* Items table */}
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
              {group.items.length === 0 ? (
                <Table.Row>
                  <Table.Cell colSpan={4} className='text-center'>
                    <p className='py-4 text-paragraph-sm text-text-soft-400'>
                      Nenhum item neste status.
                    </p>
                  </Table.Cell>
                </Table.Row>
              ) : (
                group.items.map((item) => {
                  const overdue =
                    item.dueDate && !item.completedAt && isOverdue(item.dueDate);
                  return (
                    <Table.Row key={item.id}>
                      <Table.Cell>
                        <div className='flex items-center gap-2'>
                          <StatusIcon
                            category={group.category}
                            color={group.statusColor}
                            size={12}
                          />
                          <span className='text-label-sm text-text-strong-950'>
                            {item.title}
                          </span>
                        </div>
                      </Table.Cell>
                      <Table.Cell>
                        <span className='text-paragraph-sm text-text-sub-600'>
                          {item.assigneeName ?? '—'}
                        </span>
                      </Table.Cell>
                      <Table.Cell>
                        <PriorityBadge priority={item.priority} />
                      </Table.Cell>
                      <Table.Cell>
                        {item.dueDate ? (
                          <span
                            className={cn(
                              'text-paragraph-sm',
                              overdue
                                ? 'font-medium text-error-base'
                                : 'text-text-sub-600',
                            )}
                          >
                            {formatDate(item.dueDate)}
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

export function WorkItemListView({
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
      <div className='flex flex-col gap-4'>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className='h-20 animate-pulse rounded-lg bg-bg-weak-50' />
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
    <div className='flex flex-col gap-2'>
      {visibleGroups.map((group) => (
        <GroupSection
          key={group.statusId}
          group={group}
          defaultExpanded={
            group.category === 'NOT_STARTED' || group.category === 'ACTIVE'
          }
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
