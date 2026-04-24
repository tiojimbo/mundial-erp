'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import {
  RiArchiveLine,
  RiCloseLine,
  RiDeleteBin6Line,
  RiFilter3Line,
  RiLoader4Line,
  RiRefreshLine,
  RiSearchLine,
} from '@remixicon/react';
import { cn } from '@/lib/cn';
import { useDebounce } from '@/hooks/use-debounce';
import { useInfiniteTasks } from '../hooks/use-infinite-tasks';
import { useArchiveTask } from '../hooks/use-archive-task';
import { useDeleteTask } from '../hooks/use-delete-task';
import { useUpdateTask } from '../hooks/use-update-task';
import { useTags } from '../hooks/use-tags';
import { useCustomTaskTypes } from '../hooks/use-custom-task-types';
import {
  deserializeTaskFilters,
  serializeTaskFilters,
} from '../utils/task-filters-url';
import type {
  Task,
  TaskFilters,
  TaskPriority,
} from '../types/task.types';
import {
  TaskTable,
  type TaskTableGroup,
  type TaskTableRowData,
} from '@/components/tasks/task-table';

/** Tamanho maximo do lote de bulk actions (PLANO §7.1 throttler). */
const BULK_BATCH_SIZE = 50;

const PRIORITY_OPTIONS: Array<{ value: TaskPriority; label: string }> = [
  { value: 'URGENT', label: 'Urgente' },
  { value: 'HIGH', label: 'Alta' },
  { value: 'NORMAL', label: 'Normal' },
  { value: 'LOW', label: 'Baixa' },
  { value: 'NONE', label: 'Sem prioridade' },
];

type BulkRunnerFn = (taskId: string) => Promise<unknown>;

async function runBulkInBatches(
  ids: string[],
  runner: BulkRunnerFn,
): Promise<{ ok: number; failed: string[] }> {
  let ok = 0;
  const failed: string[] = [];
  for (let i = 0; i < ids.length; i += BULK_BATCH_SIZE) {
    const batch = ids.slice(i, i + BULK_BATCH_SIZE);
    const results = await Promise.allSettled(batch.map((id) => runner(id)));
    results.forEach((result, idx) => {
      if (result.status === 'fulfilled') ok += 1;
      else failed.push(batch[idx]);
    });
  }
  return { ok, failed };
}

type TaskListViewProps = {
  /** Se informado, trava o filtro de processo (uso em /processes/[id]/list). */
  processId?: string;
  /** Filtros base injetados pela rota (ex: my-tasks). */
  baseFilters?: TaskFilters;
};

export function TaskListView({
  processId,
  baseFilters,
}: TaskListViewProps = {}): JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();

  const urlFilters = useMemo(
    () => deserializeTaskFilters(searchParams.toString()),
    [searchParams],
  );

  const [searchInput, setSearchInput] = useState<string>(
    urlFilters.search ?? '',
  );
  const debouncedSearch = useDebounce(searchInput, 300);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());

  const effectiveFilters = useMemo<TaskFilters>(() => {
    const filters: TaskFilters = {
      ...baseFilters,
      ...urlFilters,
    };
    if (processId) filters.processIds = [processId];
    if (debouncedSearch.trim().length > 0) {
      filters.search = debouncedSearch.trim();
    } else {
      delete filters.search;
    }
    return filters;
  }, [baseFilters, urlFilters, processId, debouncedSearch]);

  // Sincroniza busca com URL.
  useEffect(() => {
    const next = new URLSearchParams(searchParams.toString());
    if (debouncedSearch.trim().length > 0) {
      next.set('search', debouncedSearch.trim());
    } else {
      next.delete('search');
    }
    const target = `?${next.toString()}`;
    const current = `?${searchParams.toString()}`;
    if (target !== current) {
      router.replace(target, { scroll: false });
    }
  }, [debouncedSearch, router, searchParams]);

  const query = useInfiniteTasks(effectiveFilters);
  const tasks: Task[] = useMemo(
    () => query.data?.pages.flatMap((p) => p.data) ?? [],
    [query.data],
  );

  const tags = useTags();
  const customTypes = useCustomTaskTypes();

  const archiveTask = useArchiveTask();
  const deleteTask = useDeleteTask();
  const updateTask = useUpdateTask();

  const selectedIds = useMemo(() => Array.from(selected), [selected]);

  const toggleSelect = useCallback((id: string, next: boolean) => {
    setSelected((prev) => {
      const copy = new Set(prev);
      if (next) copy.add(id);
      else copy.delete(id);
      return copy;
    });
  }, []);

  const groups = useMemo<TaskTableGroup[]>(() => {
    const byStatus = new Map<string, TaskTableGroup>();
    for (const task of tasks) {
      const key = task.statusId;
      if (!byStatus.has(key)) {
        byStatus.set(key, {
          id: key,
          label: task.status.name,
          statusColor: task.status.color,
          count: 0,
          tasks: [],
        });
      }
      const group = byStatus.get(key)!;
      group.tasks.push(toTaskRow(task));
      group.count += 1;
    }
    return Array.from(byStatus.values());
  }, [tasks]);

  const updateUrlFilters = useCallback(
    (patch: Partial<TaskFilters>) => {
      const nextFilters: TaskFilters = { ...urlFilters, ...patch };
      for (const key of Object.keys(nextFilters) as Array<keyof TaskFilters>) {
        const value = nextFilters[key];
        if (
          value === undefined ||
          (Array.isArray(value) && value.length === 0) ||
          (typeof value === 'string' && value.length === 0)
        ) {
          delete nextFilters[key];
        }
      }
      const params = serializeTaskFilters(nextFilters);
      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [router, urlFilters],
  );

  const handleBulkArchive = useCallback(async () => {
    if (selectedIds.length === 0) return;
    const result = await runBulkInBatches(selectedIds, (id) =>
      archiveTask.mutateAsync(id),
    );
    toast.success(
      `${result.ok} tarefa(s) arquivada(s)${result.failed.length > 0 ? ` (${result.failed.length} falha(s))` : ''}`,
    );
    setSelected(new Set());
  }, [archiveTask, selectedIds]);

  const handleBulkDelete = useCallback(async () => {
    if (selectedIds.length === 0) return;
    const confirmed =
      typeof window !== 'undefined' &&
      window.confirm(
        `Excluir ${selectedIds.length} tarefa(s)? Esta acao nao pode ser desfeita.`,
      );
    if (!confirmed) return;
    const result = await runBulkInBatches(selectedIds, (id) =>
      deleteTask.mutateAsync(id),
    );
    toast.success(
      `${result.ok} tarefa(s) excluida(s)${result.failed.length > 0 ? ` (${result.failed.length} falha(s))` : ''}`,
    );
    setSelected(new Set());
  }, [deleteTask, selectedIds]);

  const handleBulkChangeStatus = useCallback(
    async (statusId: string) => {
      if (selectedIds.length === 0) return;
      const result = await runBulkInBatches(selectedIds, (id) =>
        updateTask.mutateAsync({ taskId: id, payload: { statusId } }),
      );
      toast.success(`${result.ok} tarefa(s) atualizada(s)`);
      setSelected(new Set());
    },
    [selectedIds, updateTask],
  );

  const selectedPriority = urlFilters.priority ?? [];
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const selectedStatuses = urlFilters.statuses ?? [];
  const selectedTags = urlFilters.tagIds ?? [];
  const selectedTypes = urlFilters.customTypeIds ?? [];

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2">
          <label className="relative w-full md:w-72">
            <span className="sr-only">Buscar tarefas</span>
            <RiSearchLine
              className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-sub-600"
              aria-hidden
            />
            <input
              type="search"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Buscar por titulo..."
              className="h-9 w-full rounded-md border border-stroke-soft-200 bg-bg-white-0 pl-9 pr-3 text-paragraph-sm text-text-strong-950 shadow-regular-xs outline-none focus:border-stroke-strong-950"
            />
          </label>
          <button
            type="button"
            onClick={() => query.refetch()}
            className="inline-flex h-9 items-center gap-1 rounded-md border border-stroke-soft-200 bg-bg-white-0 px-3 text-label-xs text-text-sub-600 hover:bg-bg-weak-50"
            aria-label="Atualizar"
          >
            <RiRefreshLine
              className={cn(
                'size-4',
                query.isFetching && 'animate-spin',
              )}
              aria-hidden
            />
            Atualizar
          </button>
        </div>

        <details className="group relative">
          <summary className="inline-flex h-9 cursor-pointer list-none items-center gap-2 rounded-md border border-stroke-soft-200 bg-bg-white-0 px-3 text-label-xs text-text-sub-600 hover:bg-bg-weak-50">
            <RiFilter3Line className="size-4" aria-hidden />
            Filtros
          </summary>
          <div className="absolute right-0 z-20 mt-2 w-80 rounded-lg border border-stroke-soft-200 bg-bg-white-0 p-3 shadow-regular-md">
            <PriorityFilter
              value={selectedPriority}
              onChange={(next) => updateUrlFilters({ priority: next })}
            />
            <TagFilter
              options={tags.data ?? []}
              value={selectedTags}
              onChange={(next) => updateUrlFilters({ tagIds: next })}
            />
            <CustomTypeFilter
              options={customTypes.data ?? []}
              value={selectedTypes}
              onChange={(next) => updateUrlFilters({ customTypeIds: next })}
            />
            <ArchivedFilter
              value={urlFilters.archived}
              onChange={(next) =>
                updateUrlFilters({ archived: next ?? undefined })
              }
            />
            <button
              type="button"
              className="mt-2 w-full rounded-md border border-stroke-soft-200 px-3 py-1.5 text-label-xs text-text-sub-600 hover:bg-bg-weak-50"
              onClick={() => {
                router.replace('?', { scroll: false });
                setSearchInput('');
              }}
            >
              Limpar filtros
            </button>
          </div>
        </details>
      </div>

      {/* Lista */}
      {query.isLoading ? (
        <div
          role='status'
          aria-busy='true'
          aria-live='polite'
          className='space-y-2'
        >
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className='h-12 animate-pulse rounded-md bg-muted'
            />
          ))}
        </div>
      ) : tasks.length === 0 ? (
        <div className='rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground'>
          Nenhuma tarefa encontrada. Ajuste os filtros ou crie uma nova tarefa.
        </div>
      ) : (
        <div className='overflow-x-auto rounded-xl border border-border/60 bg-card/40'>
          <div className='min-w-[1100px]'>
            <TaskTable
              groups={groups}
              selectedIds={selected}
              onToggleSelect={toggleSelect}
            />
          </div>
        </div>
      )}

      {/* Paginacao cursor */}
      {query.hasNextPage && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => query.fetchNextPage()}
            disabled={query.isFetchingNextPage}
            className="inline-flex h-9 items-center gap-2 rounded-md border border-stroke-soft-200 bg-bg-white-0 px-4 text-label-xs text-text-sub-600 hover:bg-bg-weak-50 disabled:opacity-50"
          >
            {query.isFetchingNextPage && (
              <RiLoader4Line className="size-4 animate-spin" aria-hidden />
            )}
            Carregar mais
          </button>
        </div>
      )}

      {/* Bulk actions sticky */}
      {selectedIds.length > 0 && (
        <div
          role="region"
          aria-label="Acoes em lote"
          className="sticky bottom-4 z-20 mx-auto flex flex-col gap-2 rounded-lg border border-stroke-soft-200 bg-bg-white-0 p-3 shadow-regular-md md:flex-row md:items-center"
        >
          <span className="text-label-sm text-text-strong-950">
            {selectedIds.length} selecionada(s)
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleBulkArchive}
              className="inline-flex h-8 items-center gap-1 rounded-md border border-stroke-soft-200 px-3 text-label-xs text-text-sub-600 hover:bg-bg-weak-50"
            >
              <RiArchiveLine className="size-4" aria-hidden />
              Arquivar
            </button>
            <button
              type="button"
              onClick={handleBulkDelete}
              className="inline-flex h-8 items-center gap-1 rounded-md border border-error-base px-3 text-label-xs text-error-base hover:bg-error-lighter"
            >
              <RiDeleteBin6Line className="size-4" aria-hidden />
              Excluir
            </button>
            <BulkChangeStatus
              onChange={(statusId) => handleBulkChangeStatus(statusId)}
              availableStatuses={buildStatusOptionsFromTasks(tasks)}
            />
            <button
              type="button"
              onClick={() => setSelected(new Set())}
              className="inline-flex h-8 items-center gap-1 rounded-md px-3 text-label-xs text-text-sub-600 hover:bg-bg-weak-50"
              aria-label="Limpar selecao"
            >
              <RiCloseLine className="size-4" aria-hidden />
              Limpar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function toTaskRow(task: Task): TaskTableRowData {
  return {
    id: task.id,
    href: `/tasks/${task.id}`,
    title: task.title,
    statusColor: task.status.color,
    startDate: task.startDate,
    dueDate: task.dueDate,
    assignees: task.assignees.map((a) => ({
      id: a.userId,
      name: a.userName,
    })),
  };
}

function buildStatusOptionsFromTasks(
  tasks: Task[],
): Array<{ id: string; name: string; color: string }> {
  const map = new Map<string, { id: string; name: string; color: string }>();
  for (const task of tasks) {
    if (!map.has(task.statusId)) {
      map.set(task.statusId, {
        id: task.statusId,
        name: task.status.name,
        color: task.status.color,
      });
    }
  }
  return Array.from(map.values());
}

function PriorityFilter({
  value,
  onChange,
}: {
  value: TaskPriority[];
  onChange: (next: TaskPriority[]) => void;
}): JSX.Element {
  return (
    <fieldset className="mb-3">
      <legend className="mb-1 text-label-xs uppercase text-text-sub-600">
        Prioridade
      </legend>
      <div className="flex flex-wrap gap-1">
        {PRIORITY_OPTIONS.map((option) => {
          const selected = value.includes(option.value);
          return (
            <button
              key={option.value}
              type="button"
              onClick={() =>
                onChange(
                  selected
                    ? value.filter((v) => v !== option.value)
                    : [...value, option.value],
                )
              }
              className={cn(
                'inline-flex h-7 items-center rounded-md border px-2 text-subheading-2xs',
                selected
                  ? 'border-primary-base bg-primary-alpha-10 text-primary-base'
                  : 'border-stroke-soft-200 text-text-sub-600 hover:bg-bg-weak-50',
              )}
              aria-pressed={selected}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

function TagFilter({
  options,
  value,
  onChange,
}: {
  options: Array<{ id: string; name: string; color: string }>;
  value: string[];
  onChange: (next: string[]) => void;
}): JSX.Element {
  if (options.length === 0) return <></>;
  return (
    <fieldset className="mb-3">
      <legend className="mb-1 text-label-xs uppercase text-text-sub-600">
        Tags
      </legend>
      <div className="flex flex-wrap gap-1">
        {options.map((option) => {
          const selected = value.includes(option.id);
          return (
            <button
              key={option.id}
              type="button"
              onClick={() =>
                onChange(
                  selected
                    ? value.filter((v) => v !== option.id)
                    : [...value, option.id],
                )
              }
              className={cn(
                'inline-flex h-7 items-center rounded-md border px-2 text-subheading-2xs',
                selected
                  ? 'border-primary-base bg-primary-alpha-10 text-primary-base'
                  : 'border-stroke-soft-200 text-text-sub-600 hover:bg-bg-weak-50',
              )}
              aria-pressed={selected}
            >
              {option.name}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

function CustomTypeFilter({
  options,
  value,
  onChange,
}: {
  options: Array<{ id: string; name: string }>;
  value: string[];
  onChange: (next: string[]) => void;
}): JSX.Element {
  if (options.length === 0) return <></>;
  return (
    <fieldset className="mb-3">
      <legend className="mb-1 text-label-xs uppercase text-text-sub-600">
        Tipo custom
      </legend>
      <div className="flex flex-wrap gap-1">
        {options.map((option) => {
          const selected = value.includes(option.id);
          return (
            <button
              key={option.id}
              type="button"
              onClick={() =>
                onChange(
                  selected
                    ? value.filter((v) => v !== option.id)
                    : [...value, option.id],
                )
              }
              className={cn(
                'inline-flex h-7 items-center rounded-md border px-2 text-subheading-2xs',
                selected
                  ? 'border-primary-base bg-primary-alpha-10 text-primary-base'
                  : 'border-stroke-soft-200 text-text-sub-600 hover:bg-bg-weak-50',
              )}
              aria-pressed={selected}
            >
              {option.name}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

function ArchivedFilter({
  value,
  onChange,
}: {
  value: boolean | undefined;
  onChange: (next: boolean | undefined) => void;
}): JSX.Element {
  return (
    <fieldset className="mb-3">
      <legend className="mb-1 text-label-xs uppercase text-text-sub-600">
        Arquivadas
      </legend>
      <div className="flex gap-1">
        {[
          { label: 'Nao', value: false },
          { label: 'Sim', value: true },
          { label: 'Todas', value: undefined },
        ].map((option, idx) => {
          const selected = value === option.value;
          return (
            <button
              key={idx}
              type="button"
              onClick={() => onChange(option.value)}
              className={cn(
                'inline-flex h-7 items-center rounded-md border px-2 text-subheading-2xs',
                selected
                  ? 'border-primary-base bg-primary-alpha-10 text-primary-base'
                  : 'border-stroke-soft-200 text-text-sub-600 hover:bg-bg-weak-50',
              )}
              aria-pressed={selected}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

function BulkChangeStatus({
  onChange,
  availableStatuses,
}: {
  onChange: (statusId: string) => void;
  availableStatuses: Array<{ id: string; name: string; color: string }>;
}): JSX.Element {
  if (availableStatuses.length === 0) return <></>;
  return (
    <label className="inline-flex items-center gap-1 rounded-md border border-stroke-soft-200 px-2 text-label-xs text-text-sub-600">
      <span className="sr-only">Mudar status</span>
      <select
        className="h-8 bg-transparent px-1 text-label-xs outline-none"
        defaultValue=""
        onChange={(event) => {
          const value = event.target.value;
          if (value) onChange(value);
          event.currentTarget.value = '';
        }}
      >
        <option value="">Mudar status...</option>
        {availableStatuses.map((status) => (
          <option key={status.id} value={status.id}>
            {status.name}
          </option>
        ))}
      </select>
    </label>
  );
}
