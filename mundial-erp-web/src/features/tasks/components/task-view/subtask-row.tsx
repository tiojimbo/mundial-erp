'use client';

import { Calendar, GripVertical, UserPlus } from 'lucide-react';

import type { TaskSummary } from '../../types/task.types';

/**
 * Sprint 5 (TSK-150) — SubtaskRow.
 * tasks.md §4.10 — checkbox + titulo + assignee + drag handle (dnd-kit).
 *
 * Drag real integrado na secao pai via `@dnd-kit/sortable` (TODO ativar).
 */

export type SubtaskRowProps = {
  task: Pick<
    TaskSummary,
    'id' | 'title' | 'primaryAssigneeName' | 'assignees' | 'status'
  >;
  onToggleComplete?: () => void;
};

export function SubtaskRow({ task, onToggleComplete }: SubtaskRowProps) {
  const done = task.status.category === 'DONE';
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border/60 px-3 py-2 transition-colors duration-150 hover:bg-muted/40">
      <button
        type="button"
        aria-label={done ? 'Marcar como nao concluida' : 'Concluir subtarefa'}
        aria-pressed={done}
        onClick={onToggleComplete}
        className={`h-4 w-4 rounded-full border ${done ? 'border-primary bg-primary' : 'border-dashed border-muted-foreground/60 hover:border-foreground'}`}
      />
      <a
        href={`/tasks/${task.id}`}
        className="flex-1 truncate text-sm hover:underline"
      >
        {task.title}
      </a>
      <button
        type="button"
        aria-label="Definir datas"
        className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-muted"
      >
        <Calendar className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        aria-label="Atribuir responsaveis"
        className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-muted"
      >
        <UserPlus className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        aria-label="Arrastar para reordenar"
        className="flex h-6 w-6 cursor-grab items-center justify-center rounded text-muted-foreground hover:bg-muted active:cursor-grabbing"
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
