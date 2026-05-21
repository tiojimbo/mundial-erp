'use client';

import { useMemo, useState } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { Command } from 'cmdk';
import { Plus, Search, X } from 'lucide-react';

import { cn } from '@/lib/cn';
import { useTasks } from '@/features/tasks/hooks/use-tasks';
import type { BaseFieldProps } from './field-base';
import { inputClass, inputClassInline } from './field-base';
import { FieldShell } from './field-shell';

function parseIds(raw: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const piece of raw.split(/[\s,]+/)) {
    const id = piece.trim();
    if (id.length === 0 || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

export function RelationshipField({
  definition,
  value,
  onChange,
  readOnly,
  error,
  inline,
}: BaseFieldProps<string[] | null>) {
  const isReadOnly = readOnly || definition.config?.readOnly === true;
  const relatedListId = (definition.config as Record<string, unknown> | null | undefined)?.relatedListId as string | undefined;
  const [open, setOpen] = useState(false);
  const selectedIds = useMemo(() => new Set(Array.isArray(value) ? value : []), [value]);

  const tasksQuery = useTasks(relatedListId ? { processIds: [relatedListId], limit: 50 } : undefined);
  const tasks = useMemo(
    () => (tasksQuery.data?.data ?? []) as Array<{ id: string; title: string }>,
    [tasksQuery.data],
  );
  const selectedTasks = useMemo(
    () => tasks.filter((t) => selectedIds.has(t.id)),
    [tasks, selectedIds],
  );

  if (!inline) {
    return (
      <FieldShell
        definition={definition}
        error={error}
        hint={definition.config?.hint ?? 'IDs de tasks separados por virgula'}
        showLabel
      >
        {(controlProps) => (
          <textarea
            {...controlProps}
            className={`${inputClass} min-h-[60px] py-2`}
            value={Array.isArray(value) ? value.join(', ') : ''}
            readOnly={isReadOnly}
            placeholder="task-1, task-2"
            onChange={(event) => {
              const ids = parseIds(event.target.value);
              onChange(ids.length === 0 ? null : ids);
            }}
          />
        )}
      </FieldShell>
    );
  }

  const toggle = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    const arr = Array.from(next);
    onChange(arr.length === 0 ? null : arr);
  };

  return (
    <FieldShell definition={definition} error={error} showLabel={false}>
      {(controlProps) => (
        <Popover.Root open={open} onOpenChange={setOpen}>
          <div className="flex min-w-0 flex-nowrap items-center gap-1 overflow-x-auto overflow-y-hidden [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            {selectedTasks.length === 0 ? (
              <span className="text-muted-foreground/60 shrink-0 text-xs">
                Nenhuma task relacionada
              </span>
            ) : (
              selectedTasks.map((t) => (
                <span
                  key={t.id}
                  className="bg-accent/50 text-foreground inline-flex h-7 shrink-0 items-center gap-1 rounded-full px-2.5 text-[11px] font-medium"
                >
                  <span className="max-w-[120px] truncate">{t.title}</span>
                  <button
                    type="button"
                    onClick={() => toggle(t.id)}
                    className="hover:bg-accent rounded-full p-0.5"
                    aria-label={`Remover ${t.title}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))
            )}
            <Popover.Trigger asChild>
              <button
                {...controlProps}
                type="button"
                disabled={isReadOnly}
                className="border-border/60 text-muted-foreground hover:border-primary/35 hover:bg-accent/50 hover:text-foreground inline-flex h-7 shrink-0 items-center gap-1 rounded-full border border-dashed bg-transparent px-2.5 text-[11px] font-medium transition-colors focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Plus className="h-3 w-3" />
              </button>
            </Popover.Trigger>
          </div>
          <Popover.Portal>
            <Popover.Content
              align="start"
              sideOffset={4}
              className="bg-popover text-popover-foreground z-[200] w-[280px] rounded-md border p-0 shadow-md outline-none"
            >
              <Command className="bg-popover text-popover-foreground flex h-full w-full flex-col overflow-hidden rounded-md">
                <div className="flex h-9 items-center gap-2 border-b px-3">
                  <Search className="h-4 w-4 shrink-0 opacity-50" />
                  <Command.Input
                    placeholder="Buscar tasks..."
                    className="placeholder:text-muted-foreground h-9 w-full bg-transparent py-3 text-sm outline-none"
                  />
                </div>
                <Command.List className="max-h-[300px] scroll-py-1 overflow-x-hidden overflow-y-auto">
                  <Command.Empty className="text-muted-foreground px-3 py-6 text-center text-xs">
                    {tasksQuery.isLoading ? 'Carregando…' : 'Nenhuma task encontrada'}
                  </Command.Empty>
                  <Command.Group className="overflow-hidden p-1">
                    {tasks.map((t) => {
                      const isSelected = selectedIds.has(t.id);
                      return (
                        <Command.Item
                          key={t.id}
                          value={t.title}
                          onSelect={() => toggle(t.id)}
                          className={cn(
                            'data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground',
                            'relative flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-xs outline-none select-none',
                            isSelected && 'font-medium',
                          )}
                        >
                          <span className="flex-1 truncate">{t.title}</span>
                          {isSelected && <X className="text-muted-foreground h-3 w-3" aria-label="selecionado" />}
                        </Command.Item>
                      );
                    })}
                  </Command.Group>
                </Command.List>
              </Command>
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>
      )}
    </FieldShell>
  );
}
