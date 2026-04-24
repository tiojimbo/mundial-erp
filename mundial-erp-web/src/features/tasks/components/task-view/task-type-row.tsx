'use client';

import { CircleDot } from 'lucide-react';

import type { TaskDetail } from '../../types/task.types';

/**
 * Sprint 5 (TSK-150) — Linha de tipo da tarefa.
 * tasks.md §4.1 — Pill h-6 px-2 rounded-lg border-border/60 bg-muted/40.
 */

export type TaskTypeRowProps = {
  task: Pick<TaskDetail, 'customType' | 'itemType'>;
};

export function TaskTypeRow({ task }: TaskTypeRowProps) {
  const label = task.customType?.name ?? (task.itemType === 'MILESTONE' ? 'Marco' : 'Task');
  return (
    <header className="flex items-center gap-2">
      <button
        type="button"
        aria-label="Alterar tipo da tarefa"
        className="flex items-center gap-1.5 rounded-lg border border-border/60 bg-muted/40 px-2 text-sm transition-all duration-150 hover:border-border hover:bg-muted active:scale-[0.97]"
        style={{ height: '1.5rem' }}
      >
        <CircleDot className="h-3.5 w-3.5" />
        <span>{label}</span>
      </button>
    </header>
  );
}
