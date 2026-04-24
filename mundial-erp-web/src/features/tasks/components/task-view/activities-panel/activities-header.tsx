'use client';

import { useState } from 'react';
import { Filter, MoreHorizontal, Search, X } from 'lucide-react';

import * as Popover from '@/components/ui/popover';
import * as RadioGroup from '@/components/ui/radio';
import * as Checkbox from '@/components/ui/checkbox';
import { useTasksStore } from '../../../stores/tasks.store';
import {
  ACTION_LABELS_PT,
  DEFAULT_ACTIVITY_FILTERS,
  TASK_ACTIVITY_TYPES,
  activityFiltersSchema,
  type ActivityFilters,
  type ActivityFilterGroup,
  type TaskActivityTypeLiteral,
} from '../../../schemas/activity-filters.schema';

/**
 * Sprint 5 (TSK-160) — Header do painel de atividades.
 * tasks.md §5.1 — h-12 border-b px-4 flex justify-between.
 * Todos os IconButtons com aria-label. Filtro substituido por Popover
 * com radio de tipo + grid de checkboxes de actions + TODO actorIds.
 */

export type ActivitiesHeaderProps = {
  taskId: string;
  onClose?: () => void;
};

function IconButton({
  label,
  children,
  onClick,
  pressed = false,
}: {
  label: string;
  children: React.ReactNode;
  onClick?: () => void;
  pressed?: boolean;
}) {
  return (
    <button
      type='button'
      onClick={onClick}
      aria-label={label}
      aria-pressed={pressed}
      className={`flex h-7 w-7 items-center justify-center rounded-md transition-colors duration-150 ${
        pressed
          ? 'bg-muted text-foreground'
          : 'text-muted-foreground hover:bg-muted'
      }`}
    >
      {children}
    </button>
  );
}

export function ActivitiesHeader({ taskId, onClose }: ActivitiesHeaderProps) {
  const storedFilter = useTasksStore(
    (s) => s.activitiesFilters[taskId] ?? DEFAULT_ACTIVITY_FILTERS,
  );
  const setActivitiesFilter = useTasksStore((s) => s.setActivitiesFilter);
  const clearActivitiesFilter = useTasksStore((s) => s.clearActivitiesFilter);

  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<ActivityFilters>(storedFilter);

  const hasActiveFilter =
    storedFilter.type !== 'ALL' ||
    storedFilter.actions.length > 0 ||
    storedFilter.actorIds.length > 0;

  function handleOpenChange(next: boolean) {
    if (next) {
      setDraft(storedFilter);
    }
    setOpen(next);
  }

  function handleTypeChange(value: string) {
    setDraft((d) => ({ ...d, type: value as ActivityFilterGroup }));
  }

  function toggleAction(action: TaskActivityTypeLiteral) {
    setDraft((d) => {
      const exists = d.actions.includes(action);
      return {
        ...d,
        actions: exists
          ? d.actions.filter((a) => a !== action)
          : [...d.actions, action],
      };
    });
  }

  function handleApply() {
    const parsed = activityFiltersSchema.safeParse(draft);
    if (!parsed.success) return;
    setActivitiesFilter(taskId, parsed.data);
    setOpen(false);
  }

  function handleClear() {
    clearActivitiesFilter(taskId);
    setDraft(DEFAULT_ACTIVITY_FILTERS);
    setOpen(false);
  }

  return (
    <header className='flex h-12 items-center justify-between border-b border-border/60 px-4'>
      <h2 className='text-sm font-semibold'>Atividades</h2>
      <div className='flex items-center gap-1'>
        <IconButton label='Buscar atividades'>
          <Search className='h-4 w-4' />
        </IconButton>

        <Popover.Root open={open} onOpenChange={handleOpenChange}>
          <Popover.Trigger asChild>
            <button
              type='button'
              aria-label='Filtrar atividades'
              aria-pressed={hasActiveFilter}
              className={`relative flex h-7 w-7 items-center justify-center rounded-md transition-colors duration-150 ${
                hasActiveFilter
                  ? 'bg-muted text-foreground'
                  : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              <Filter className='h-4 w-4' />
              {hasActiveFilter ? (
                <span
                  className='absolute right-1 top-1 block size-1.5 rounded-full bg-primary'
                  aria-hidden='true'
                />
              ) : null}
            </button>
          </Popover.Trigger>

          <Popover.Content
            align='end'
            sideOffset={8}
            showArrow={false}
            className='w-[320px] p-4'
          >
            <div className='flex flex-col gap-4'>
              <div>
                <p className='mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground'>
                  Tipo
                </p>
                <RadioGroup.Group
                  value={draft.type}
                  onValueChange={handleTypeChange}
                  className='flex flex-col gap-2'
                >
                  {(
                    [
                      { value: 'ALL', label: 'Todos' },
                      { value: 'ACTIVITY', label: 'Atividades' },
                      { value: 'COMMENT', label: 'Comentarios' },
                    ] as const
                  ).map((opt) => (
                    <label
                      key={opt.value}
                      className='flex cursor-pointer items-center gap-2 text-[13px] text-foreground'
                    >
                      <RadioGroup.Item value={opt.value} id={`type-${opt.value}`} />
                      <span>{opt.label}</span>
                    </label>
                  ))}
                </RadioGroup.Group>
              </div>

              <div>
                <p className='mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground'>
                  Acoes
                </p>
                <div className='grid max-h-[240px] grid-cols-2 gap-x-3 gap-y-2 overflow-y-auto pr-1'>
                  {TASK_ACTIVITY_TYPES.map((action) => {
                    const id = `action-${action}`;
                    const checked = draft.actions.includes(action);
                    return (
                      <label
                        key={action}
                        htmlFor={id}
                        className='flex cursor-pointer items-center gap-2 text-[12px] text-foreground'
                      >
                        <Checkbox.Root
                          id={id}
                          checked={checked}
                          onCheckedChange={() => toggleAction(action)}
                        />
                        <span className='truncate'>
                          {ACTION_LABELS_PT[action]}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* TODO Sprint 5.1: integrar AssigneeMultiPicker para `actorIds`. */}

              <div className='flex items-center justify-end gap-2 border-t border-border/60 pt-3'>
                <button
                  type='button'
                  onClick={handleClear}
                  className='h-8 rounded-md px-3 text-[12px] font-medium text-muted-foreground transition-colors hover:bg-muted'
                >
                  Limpar
                </button>
                <button
                  type='button'
                  onClick={handleApply}
                  className='h-8 rounded-md bg-primary px-3 text-[12px] font-medium text-primary-foreground transition-opacity hover:opacity-90'
                >
                  Aplicar
                </button>
              </div>
            </div>
          </Popover.Content>
        </Popover.Root>

        <IconButton label='Opcoes da tarefa'>
          <MoreHorizontal className='h-4 w-4' />
        </IconButton>
        <IconButton label='Fechar atividades' onClick={onClose}>
          <X className='h-4 w-4' />
        </IconButton>
      </div>
    </header>
  );
}
