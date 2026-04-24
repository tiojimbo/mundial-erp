'use client';

import type { KeyboardEvent } from 'react';

import type { TaskChecklist, TaskChecklistItem } from '../../types/task.types';

import { ProgressBar } from './progress-bar';

/**
 * Sprint 5 (TSK-150) — ChecklistPanel.
 * tasks.md §4.11. Teclado:
 *   - setas sobem/descem selecao
 *   - space resolve (toggle)
 *
 * Drag & drop via `@dnd-kit/sortable` (TODO: envolver com SortableContext
 * na integracao com `useReorderChecklist`).
 */

export type ChecklistPanelProps = {
  checklist: TaskChecklist;
  onToggleItem?: (itemId: string, completed: boolean) => void;
};

function flatten(items: TaskChecklistItem[]): TaskChecklistItem[] {
  return items.reduce<TaskChecklistItem[]>((acc, it) => {
    acc.push(it);
    if (it.children && Array.isArray(it.children)) {
      acc.push(...flatten(it.children as TaskChecklistItem[]));
    }
    return acc;
  }, []);
}

export function ChecklistPanel({ checklist, onToggleItem }: ChecklistPanelProps) {
  const items = flatten(checklist.items);
  const done = items.filter((i) => i.completed).length;

  function handleKey(e: KeyboardEvent<HTMLInputElement>, item: TaskChecklistItem) {
    if (e.key === ' ') {
      e.preventDefault();
      onToggleItem?.(item.id, !item.completed);
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = e.currentTarget.closest('li')?.nextElementSibling;
      (next?.querySelector('input') as HTMLInputElement | null)?.focus();
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prev = e.currentTarget.closest('li')?.previousElementSibling;
      (prev?.querySelector('input') as HTMLInputElement | null)?.focus();
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border/60 p-3">
      <header className="flex items-center justify-between">
        <h3 className="text-[13px] font-semibold">{checklist.title}</h3>
        <span className="text-[11px] text-muted-foreground">
          {done}/{items.length}
        </span>
      </header>
      {items.length > 0 && <ProgressBar value={done} max={items.length} label={`${checklist.title} progresso`} />}
      <ul className="flex flex-col gap-1">
        {items.map((it) => (
          <li key={it.id} className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={it.completed}
              onChange={(e) => onToggleItem?.(it.id, e.target.checked)}
              onKeyDown={(e) => handleKey(e, it)}
              aria-label={it.text}
              className="h-4 w-4 rounded border-border"
            />
            <span
              className={`text-[13px] ${it.completed ? 'text-muted-foreground line-through' : 'text-foreground'}`}
            >
              {it.text}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
