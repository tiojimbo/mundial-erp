'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  RiArrowDownSLine,
  RiArrowRightSLine,
  RiDraggable,
  RiUserAddLine,
  RiCalendarLine,
  RiChat1Line,
  RiAddLine,
  RiPriceTag3Line,
  RiEditLine,
} from '@remixicon/react';
import { RiCheckLine } from '@remixicon/react';
import { cn } from '@/lib/cn';
import { StatusIcon } from './status-icon';
import { StatusIconPopover } from './status-icon-popover';
import { formatShortDate } from '@/lib/formatters';
import { useTasksSelectionStore } from '@/stores/tasks-selection.store';
import type {
  ProcessSummaryList,
  StatusGroupSummary,
  WorkItemSummary,
} from '@/features/navigation/types/process-summary.types';

type ProcessCardListBodyProps = {
  process: ProcessSummaryList;
  departmentId: string;
  areaId?: string | null;
};

export function ProcessCardListBody({
  process,
  departmentId,
  areaId,
}: ProcessCardListBodyProps) {
  if (process.groups.length === 0) {
    return (
      <div className="px-5 pb-4">
        <p className="text-paragraph-sm text-text-soft-400">
          Nenhum item neste processo.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 pb-3 pt-2">
      {process.groups.map((group) => (
        <StatusGroupSection
          key={group.statusId}
          group={group}
          departmentId={departmentId}
          areaId={areaId}
        />
      ))}
    </div>
  );
}

function StatusGroupSection({
  group,
  departmentId,
  areaId,
}: {
  group: StatusGroupSummary;
  departmentId: string;
  areaId?: string | null;
}) {
  const [expanded, setExpanded] = useState(
    group.statusCategory === 'NOT_STARTED' || group.statusCategory === 'ACTIVE',
  );

  return (
    <div className="relative">
      {/* Status badge header — sticky */}
      <div className="sticky top-0 z-[25] flex min-h-10 items-center bg-bg-white-0 pl-6">
        <div className="flex w-fit items-center gap-2">
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="flex items-center justify-center rounded-md p-0.5 cursor-pointer text-text-soft-400 transition-colors duration-150 hover:bg-bg-weak-50 hover:text-text-sub-600"
          >
            <RiArrowDownSLine
              className={cn(
                'size-4 transition-transform duration-150',
                !expanded && '-rotate-90',
              )}
            />
          </button>

          {/* Status badge with dynamic color */}
          <div
            className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] font-semibold uppercase leading-none tracking-wide transition-colors duration-150"
            style={{
              backgroundColor: hexToRgba(group.statusColor, 0.125),
              color: group.statusColor,
            }}
          >
            <StatusIcon
              category={group.statusCategory}
              color={group.statusColor}
              size={14}
            />
            <span>{group.statusName}</span>
          </div>

          <span className="ml-1 text-label-xs tabular-nums text-text-soft-400">
            {group.count}
          </span>
        </div>
      </div>

      {/* Rows */}
      {expanded && (
        <div className="relative min-w-max">
          {/* Column headers — sticky below status badge */}
          <div className="sticky top-10 z-20 flex h-11 items-center bg-bg-white-0 pl-[44px] text-[12.8px] font-medium text-text-soft-400">
            <div className="w-[400px] px-2 py-1.5">Nome</div>
            <div className="w-[200px] px-2 py-1.5">Responsável</div>
            <div className="w-[200px] px-2 py-1.5">Início</div>
            <div className="w-[200px] px-2 py-1.5">Prazo</div>
            <div className="w-[150px] px-2 py-1.5">Comentários</div>
            <div className="w-10" />
          </div>

          {/* Task rows */}
          {group.items.map((item) => (
            <TaskRow
              key={item.id}
              item={item}
              group={group}
              departmentId={departmentId}
              areaId={areaId}
            />
          ))}

          {/* Nova tarefa */}
          <button
            type="button"
            className="mt-2 block w-[400px] rounded-md px-4 py-2 pl-[44px] text-[12.8px] font-medium text-text-soft-400 transition-all duration-200 hover:bg-gradient-to-r hover:from-transparent hover:to-bg-weak-50"
          >
            Nova tarefa
          </button>
        </div>
      )}
    </div>
  );
}

function TaskRow({
  item,
  group,
  departmentId,
  areaId,
}: {
  item: WorkItemSummary;
  group: StatusGroupSummary;
  departmentId: string;
  areaId?: string | null;
}) {
  const router = useRouter();
  const isSelected = useTasksSelectionStore((s) => s.selectedIds.includes(item.id));
  const toggleSelection = useTasksSelectionStore((s) => s.toggle);
  const isOverdue =
    item.dueDate &&
    group.statusCategory !== 'DONE' &&
    group.statusCategory !== 'CLOSED' &&
    new Date(item.dueDate) < new Date();

  const openTask = () => router.push(`/tasks/${item.id}`);
  const stop = (e: React.SyntheticEvent) => e.stopPropagation();

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Abrir tarefa ${item.title}`}
      onClick={openTask}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openTask();
        }
      }}
      data-selected={isSelected || undefined}
      className="group relative flex cursor-pointer select-none pl-[44px] pr-10 -mt-px border-t border-t-transparent border-b border-b-transparent hover:border-t-stroke-soft-200 hover:border-b-stroke-soft-200 hover:bg-bg-weak-50 data-[selected]:bg-[#F5F5F5] hover:z-[1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stroke-strong-950/30"
    >
      {/* Hover actions overlay (drag handle + checkbox) */}
      <div
        className={cn(
          'absolute left-0 top-0 bottom-0 z-10 flex w-[44px] shrink-0 items-center justify-end gap-0.5 pr-1 transition-opacity',
          isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
        )}
        onClick={stop}
      >
        <div className="flex size-3.5 items-center justify-center text-text-soft-400 hover:text-text-sub-600">
          <RiDraggable className="size-3.5" />
        </div>
        <button
          type="button"
          role="checkbox"
          aria-checked={isSelected}
          aria-label={isSelected ? `Desmarcar ${item.title}` : `Marcar ${item.title}`}
          onClick={(e) => {
            e.stopPropagation();
            toggleSelection(item.id);
          }}
          className={cn(
            'flex size-[14px] items-center justify-center rounded-[4px] border-[1.5px] cursor-pointer transition-colors',
            isSelected
              ? 'border-primary-base bg-primary-base text-static-white'
              : 'border-text-soft-400 bg-bg-white-0 hover:border-text-sub-600',
          )}
        >
          {isSelected && <RiCheckLine className="size-3" />}
        </button>
      </div>

      {/* Name column */}
      <div className="flex w-[400px] shrink-0 items-center gap-1.5 px-2 py-2">
        <button
          type="button"
          onClick={stop}
          aria-label="Expandir subtasks"
          className="flex size-5 shrink-0 items-center justify-center rounded-md border border-transparent text-text-soft-400 opacity-0 transition-all duration-150 group-hover:opacity-100 hover:border-stroke-soft-200"
        >
          <RiArrowRightSLine className="size-3.5 transition-transform duration-150" />
        </button>

        <StatusIconPopover
          taskId={item.id}
          departmentId={departmentId}
          areaId={areaId}
          currentStatusId={item.statusId}
          currentCategory={group.statusCategory}
          currentColor={group.statusColor}
          size={14}
        />

        <span className="min-w-0 truncate text-[14px] font-medium tracking-[-0.154px] text-text-strong-950">
          {item.title}
        </span>

        {/* Quick actions (hover only) */}
        <div
          className="ml-auto flex items-center gap-1 opacity-0 group-hover:opacity-100"
          onClick={stop}
        >
          <button
            type="button"
            aria-label="Criar subtask"
            className="flex size-7 items-center justify-center rounded-lg border-[0.8px] border-stroke-soft-200 text-text-soft-400 transition-colors hover:bg-bg-weak-50 hover:text-text-sub-600"
          >
            <RiAddLine className="size-3.5" />
          </button>
          <div className="flex size-7 items-center justify-center rounded-lg border-[0.8px] border-stroke-soft-200 text-text-soft-400">
            <RiPriceTag3Line className="size-3.5" />
          </div>
          <button
            type="button"
            aria-label="Editar tarefa"
            className="flex size-7 items-center justify-center rounded-lg border-[0.8px] border-stroke-soft-200 text-text-soft-400 transition-colors hover:bg-bg-weak-50 hover:text-text-sub-600"
          >
            <RiEditLine className="size-3.5" />
          </button>
        </div>
      </div>

      {/* Assigned to column */}
      <div className="flex w-[200px] shrink-0 items-center px-2 py-2">
        {item.assigneeName ? (
          <div className="flex items-center gap-2">
            <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary-base text-[10px] font-medium text-static-white">
              {item.assigneeName.charAt(0).toUpperCase()}
            </div>
            <span className="truncate text-paragraph-sm text-text-sub-600">
              {item.assigneeName}
            </span>
          </div>
        ) : (
          <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-bg-weak-50 text-text-soft-400 ring-1 ring-inset ring-stroke-soft-200">
            <RiUserAddLine className="size-3.5" />
          </div>
        )}
      </div>

      {/* Start date column */}
      <div className="flex w-[200px] shrink-0 items-center px-2 py-2">
        {item.startDate ? (
          <span className="text-paragraph-sm text-text-sub-600">
            {formatShortDate(item.startDate)}
          </span>
        ) : (
          <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-bg-weak-50 text-text-soft-400 ring-1 ring-inset ring-stroke-soft-200">
            <RiCalendarLine className="size-3.5" />
          </div>
        )}
      </div>

      {/* Due date column */}
      <div className="flex w-[200px] shrink-0 items-center px-2 py-2">
        {item.dueDate ? (
          <span
            className={cn(
              'text-paragraph-sm',
              isOverdue ? 'font-medium text-error-base' : 'text-text-sub-600',
            )}
          >
            {formatShortDate(item.dueDate)}
          </span>
        ) : (
          <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-bg-weak-50 text-text-soft-400 ring-1 ring-inset ring-stroke-soft-200">
            <RiCalendarLine className="size-3.5" />
          </div>
        )}
      </div>

      {/* Comments column */}
      <div className="flex w-[150px] shrink-0 items-center gap-1.5 px-2 py-2 text-text-soft-400 transition-colors hover:text-text-strong-950">
        <RiChat1Line className="size-3.5 shrink-0" />
      </div>
    </div>
  );
}

function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  if (isNaN(r) || isNaN(g) || isNaN(b)) return hex;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
