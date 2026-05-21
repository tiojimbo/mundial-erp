'use client';

import { useState, useEffect } from 'react';
import {
  RiSearchLine,
  RiFilterLine,
  RiEyeLine,
  RiEyeOffLine,
  RiEqualizerLine,
  RiCheckLine,
  RiSortAsc,
  RiSortDesc,
  RiDeleteBinLine,
  RiAddLine,
} from '@remixicon/react';
import { Group } from 'lucide-react';
import * as Popover from '@/components/ui/popover';
import { CustomFieldsManagerDialog } from '@/features/custom-fields/components/manager/custom-fields-manager-dialog';
import type { ManagerView } from '@/features/custom-fields/hooks/use-custom-fields-manager-state';

const GROUP_OPTIONS = [
  { value: 'status', label: 'Status' },
  { value: 'assignee', label: 'Responsável' },
  { value: 'priority', label: 'Prioridade' },
  { value: 'tag', label: 'Tag' },
  { value: 'dueDate', label: 'Data de vencimento' },
  { value: 'itemType', label: 'Tipo de tarefa' },
] as const;

type GroupByValue = (typeof GROUP_OPTIONS)[number]['value'];

type ProcessToolbarDefaultType = {
  value: string;
  pluralName: string | null;
  icon: string | null;
};

export type ProcessToolbarCustomFieldsScope =
  | { kind: 'space'; spaceId: string }
  | { kind: 'folder'; folderId: string }
  | { kind: 'list'; listId: string };

type ProcessToolbarProps = {
  search: string;
  onSearchChange: (value: string) => void;
  showClosed: boolean;
  onShowClosedChange: (value: boolean) => void;
  closedCount?: number;
  onCreateTask?: () => void;
  defaultTaskType?: ProcessToolbarDefaultType | null;
  customFieldsScope?: ProcessToolbarCustomFieldsScope;
};

export function ProcessToolbar({
  search,
  onSearchChange,
  showClosed,
  onShowClosedChange,
  closedCount = 0,
  onCreateTask,
  defaultTaskType,
  customFieldsScope,
}: ProcessToolbarProps) {
  const [localSearch, setLocalSearch] = useState(search);
  const [groupBy, setGroupBy] = useState<GroupByValue>('status');
  const [groupOrder, setGroupOrder] = useState<'asc' | 'desc'>('asc');
  const [cfManagerOpen, setCfManagerOpen] = useState(false);
  const cfInitialView: ManagerView | undefined = customFieldsScope
    ? customFieldsScope.kind === 'space'
      ? { kind: 'space', spaceId: customFieldsScope.spaceId }
      : customFieldsScope.kind === 'folder'
        ? { kind: 'folder', folderId: customFieldsScope.folderId }
        : { kind: 'list', listId: customFieldsScope.listId }
    : undefined;

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
                className="flex h-7 items-center gap-1.5 rounded-lg px-2.5 text-[13px] font-medium tracking-tight text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <Group className="size-3.5" />
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
              className="w-52 rounded-xl bg-background p-2 shadow-md ring-1 ring-inset ring-border"
            >
              <p className="px-2 py-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
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
                        ? 'bg-accent font-medium text-foreground'
                        : 'font-normal text-foreground hover:bg-accent'
                    }`}
                  >
                    {opt.label}
                    {isSelected && (
                      <RiCheckLine className="size-3.5 text-foreground" />
                    )}
                  </button>
                );
              })}

              <div className="my-1.5 h-px bg-border" />

              <div className="flex items-center gap-1 px-1">
                <button
                  type="button"
                  onClick={() => setGroupOrder('asc')}
                  className={`flex flex-1 items-center justify-center gap-1 rounded-lg py-1.5 text-[11px] font-medium transition-colors ${
                    groupOrder === 'asc'
                      ? 'bg-accent text-foreground'
                      : 'text-muted-foreground hover:bg-accent'
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
                      ? 'bg-accent text-foreground'
                      : 'text-muted-foreground hover:bg-accent'
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

        </div>

        {/* SPACER */}
        <div className="flex-1" />

        {/* RIGHT SIDE */}
        <div className="flex items-center gap-2">
          {/* Filtros button (ghost) */}
          <button
            type="button"
            className="flex h-7 items-center gap-1.5 rounded-lg px-2.5 text-[13px] font-medium tracking-tight text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <RiFilterLine className="size-3.5" />
            Filtros
          </button>

          {/* Fechadas button (ghost + toggle) */}
          <button
            type="button"
            onClick={() => onShowClosedChange(!showClosed)}
            className="flex h-7 items-center gap-1.5 rounded-lg px-2.5 text-[13px] font-medium tracking-tight text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
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
          <div className="flex h-[29px] w-40 items-center gap-1.5 rounded-lg border border-border bg-accent px-2.5 transition-all focus-within:border-ring focus-within:bg-background focus-within:ring-2 focus-within:ring-ring/20">
            <RiSearchLine className="size-3.5 shrink-0 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar..."
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              className="w-full bg-transparent text-[13px] text-foreground placeholder:text-muted-foreground outline-none"
            />
          </div>

          {/* Config icon button: gerenciar campos personalizados deste escopo */}
          <button
            type="button"
            aria-label="Gerenciar campos personalizados deste escopo"
            disabled={!customFieldsScope}
            onClick={() => setCfManagerOpen(true)}
            className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
          >
            <RiEqualizerLine className="size-3.5" />
          </button>

          {/* + Criar button (primary) — ícone "+" fixo; texto reflete o tipo padrão */}
          <button
            type="button"
            onClick={onCreateTask}
            className="ml-1 flex h-7 items-center gap-1.5 rounded-lg bg-foreground px-3 text-[13px] font-medium tracking-tight text-background transition-colors hover:bg-foreground/90"
          >
            <RiAddLine className="size-3.5" />
            {defaultTaskType?.value ?? 'Criar'}
          </button>

        </div>
      </div>
      {cfInitialView ? (
        <CustomFieldsManagerDialog
          open={cfManagerOpen}
          onClose={() => setCfManagerOpen(false)}
          initialView={cfInitialView}
        />
      ) : null}
    </div>
  );
}
