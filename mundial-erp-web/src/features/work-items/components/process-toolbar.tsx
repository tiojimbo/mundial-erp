'use client';

import { useState, useEffect } from 'react';
import {
  RiSearchLine,
  RiFilterLine,
  RiEyeLine,
  RiEyeOffLine,
  RiLayoutGridLine,
  RiNodeTree,
  RiEqualizerLine,
  RiCheckLine,
  RiSortAsc,
  RiSortDesc,
  RiDeleteBinLine,
  RiAddLine,
} from '@remixicon/react';
import * as Popover from '@/components/ui/popover';

const GROUP_OPTIONS = [
  { value: 'status', label: 'Status' },
  { value: 'assignee', label: 'Responsável' },
  { value: 'priority', label: 'Prioridade' },
  { value: 'tag', label: 'Tag' },
  { value: 'dueDate', label: 'Data de vencimento' },
  { value: 'itemType', label: 'Tipo de tarefa' },
] as const;

type GroupByValue = (typeof GROUP_OPTIONS)[number]['value'];

type ProcessToolbarProps = {
  search: string;
  onSearchChange: (value: string) => void;
  showClosed: boolean;
  onShowClosedChange: (value: boolean) => void;
  closedCount?: number;
  onCreateTask?: () => void;
};

export function ProcessToolbar({
  search,
  onSearchChange,
  showClosed,
  onShowClosedChange,
  closedCount = 0,
  onCreateTask,
}: ProcessToolbarProps) {
  const [localSearch, setLocalSearch] = useState(search);
  const [groupBy, setGroupBy] = useState<GroupByValue>('status');
  const [groupOrder, setGroupOrder] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    const timer = setTimeout(() => onSearchChange(localSearch), 300);
    return () => clearTimeout(timer);
  }, [localSearch]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync external search changes back to local state
  useEffect(() => {
    setLocalSearch(search);
  }, [search]);

  return (
    <div className="shrink-0 py-1.5">
      <div className="flex w-full items-center px-10">
        {/* LEFT SIDE */}
        <div className="flex items-center gap-2">
          {/* Agrupar: popover */}
          <Popover.Root>
            <Popover.Trigger asChild>
              <button
                type="button"
                className="flex h-7 items-center gap-1.5 rounded-lg bg-[oklch(20.5%_0_0/0.10)] px-2.5 text-[12px] font-medium text-[oklch(20.5%_0_0)] transition-colors hover:bg-[oklch(20.5%_0_0/0.15)]"
              >
                <RiLayoutGridLine className="size-3.5" />
                Agrupar:{' '}
                <span className="font-semibold">
                  {GROUP_OPTIONS.find((o) => o.value === groupBy)?.label}
                </span>
              </button>
            </Popover.Trigger>

            <Popover.Content
              align="start"
              sideOffset={6}
              showArrow={false}
              unstyled
              className="w-52 rounded-xl bg-bg-white-0 p-2 shadow-regular-md ring-1 ring-inset ring-stroke-soft-200"
            >
              <p className="px-2 py-1.5 text-[11px] font-medium uppercase tracking-wider text-[oklch(0.556_0_0)]">
                Agrupar por
              </p>

              {GROUP_OPTIONS.map((opt) => {
                const isSelected = groupBy === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setGroupBy(opt.value)}
                    className={`flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-[13px] tracking-[-0.154px] transition-colors ${
                      isSelected
                        ? 'bg-[oklch(20.5%_0_0/0.10)] font-medium text-[oklch(20.5%_0_0)]'
                        : 'font-normal text-text-strong-950 hover:bg-bg-weak-50'
                    }`}
                  >
                    {opt.label}
                    {isSelected && (
                      <RiCheckLine className="size-3.5 text-[oklch(20.5%_0_0)]" />
                    )}
                  </button>
                );
              })}

              <div className="my-1.5 h-px bg-stroke-soft-200" />

              <div className="flex items-center gap-1 px-1">
                <button
                  type="button"
                  onClick={() => setGroupOrder('asc')}
                  className={`flex flex-1 items-center justify-center gap-1 rounded-lg py-1.5 text-[11px] font-medium transition-colors ${
                    groupOrder === 'asc'
                      ? 'bg-bg-weak-50 text-[oklch(0.145_0_0)]'
                      : 'text-[oklch(0.556_0_0)] hover:bg-bg-weak-50'
                  }`}
                >
                  <RiSortAsc className="size-3.5" />
                  ASC
                </button>
                <button
                  type="button"
                  onClick={() => setGroupOrder('desc')}
                  className={`flex flex-1 items-center justify-center gap-1 rounded-lg py-1.5 text-[11px] font-medium transition-colors ${
                    groupOrder === 'desc'
                      ? 'bg-bg-weak-50 text-[oklch(0.145_0_0)]'
                      : 'text-[oklch(0.556_0_0)] hover:bg-bg-weak-50'
                  }`}
                >
                  <RiSortDesc className="size-3.5" />
                  DESC
                </button>
                <button
                  type="button"
                  onClick={() => setGroupBy('status')}
                  className="flex size-7 items-center justify-center rounded-lg text-error-base transition-colors hover:bg-error-base/10"
                >
                  <RiDeleteBinLine className="size-3.5" />
                </button>
              </div>

            </Popover.Content>
          </Popover.Root>

          {/* Subtasks button (ghost) */}
          <button
            type="button"
            className="flex h-7 items-center gap-1.5 rounded-lg px-2.5 text-[12px] font-medium text-text-sub-600 transition-colors hover:bg-bg-weak-50"
          >
            <RiNodeTree className="size-3.5" />
            Subtasks
          </button>
        </div>

        {/* SPACER */}
        <div className="flex-1" />

        {/* RIGHT SIDE */}
        <div className="flex items-center gap-2">
          {/* Filtros button (ghost) */}
          <button
            type="button"
            className="flex h-7 items-center gap-1.5 rounded-lg px-2.5 text-[12px] font-medium text-text-sub-600 transition-colors hover:bg-bg-weak-50"
          >
            <RiFilterLine className="size-3.5" />
            Filtros
          </button>

          {/* Fechadas button (ghost + toggle) */}
          <button
            type="button"
            onClick={() => onShowClosedChange(!showClosed)}
            className="flex h-7 items-center gap-1.5 rounded-lg px-2.5 text-[12px] font-medium text-text-sub-600 transition-colors hover:bg-bg-weak-50"
          >
            {showClosed ? (
              <RiEyeOffLine className="size-3.5" />
            ) : (
              <RiEyeLine className="size-3.5" />
            )}
            {showClosed
              ? 'Fechadas'
              : `Fechadas${closedCount > 0 ? ` (${closedCount})` : ''}`}
          </button>

          {/* Search input (always visible) */}
          <div className="flex h-[29px] w-40 items-center gap-1.5 rounded-lg border-[0.8px] border-stroke-soft-200 bg-bg-weak-50 px-2.5 transition-all focus-within:border-text-soft-400 focus-within:bg-bg-white-0 focus-within:ring-2 focus-within:ring-text-soft-400/20">
            <RiSearchLine className="size-3.5 shrink-0 text-text-soft-400" />
            <input
              type="text"
              placeholder="Buscar..."
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              className="w-full bg-transparent text-[12px] text-text-strong-950 placeholder:text-text-soft-400 outline-none"
            />
          </div>

          {/* Config icon button */}
          <button
            type="button"
            className="flex size-7 items-center justify-center rounded-md text-text-sub-600 transition-colors hover:bg-bg-weak-50"
          >
            <RiEqualizerLine className="size-3.5" />
          </button>

          {/* + Criar button (primary) */}
          <button
            type="button"
            onClick={onCreateTask}
            className="ml-1 flex h-7 items-center gap-1.5 rounded-lg bg-text-strong-950 px-3 text-[12px] font-medium text-white transition-colors hover:bg-text-strong-950/90"
          >
            <RiAddLine className="size-3.5" />
            Criar
          </button>

        </div>
      </div>
    </div>
  );
}
