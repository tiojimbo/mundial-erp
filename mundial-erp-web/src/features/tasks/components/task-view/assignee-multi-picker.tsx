'use client';

import { useMemo, useState } from 'react';
import { UserPlus } from 'lucide-react';

import type { TaskAssignee } from '../../types/task.types';

/**
 * Sprint 5 (TSK-150) — Assignee multi-picker com AvatarGroup + Popover Command.
 * tasks.md §4.3 linha "Responsaveis". Overflow +N.
 *
 * TODO Sprint 5.1: popover Command real com search e teclado setas,
 * integrando com `useUsers()` do workspace.
 */

export type AssigneeMultiPickerProps = {
  taskId: string;
  assignees: TaskAssignee[];
  placeholder?: string;
  onChange?: (add: string[], rem: string[]) => void;
};

const VISIBLE_MAX = 3;

function initials(name: string | null): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase();
}

export function AssigneeMultiPicker({
  assignees,
  placeholder = 'Adicionar',
}: AssigneeMultiPickerProps) {
  const [open, setOpen] = useState(false);
  // Defensive: o detail endpoint so retorna `assignees` quando `include=assignees`
  // esta presente na query; sem isso a prop vira undefined e quebra .slice/.length.
  const safeAssignees = assignees ?? [];
  const visible = useMemo(
    () => safeAssignees.slice(0, VISIBLE_MAX),
    [safeAssignees],
  );
  const overflow = safeAssignees.length - VISIBLE_MAX;

  if (safeAssignees.length === 0) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Adicionar responsaveis"
        className="flex items-center gap-1.5 text-[13px] font-normal text-muted-foreground/60 hover:text-muted-foreground"
      >
        <UserPlus className="h-3.5 w-3.5" />
        {placeholder}
      </button>
    );
  }

  return (
    <div className="relative inline-flex">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`Responsaveis (${safeAssignees.length})`}
        className="flex items-center -space-x-1.5 rounded-md px-1 py-0.5 transition-colors hover:bg-muted"
      >
        {visible.map((a) => (
          <span
            key={a.userId}
            className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-[10px] font-medium text-foreground ring-2 ring-card"
            title={a.userName ?? a.userId}
          >
            {initials(a.userName)}
          </span>
        ))}
        {overflow > 0 && (
          <span className="flex h-6 min-w-[24px] items-center justify-center rounded-full bg-muted px-1 text-[10px] font-medium text-muted-foreground ring-2 ring-card">
            +{overflow}
          </span>
        )}
      </button>
      {open && (
        <div
          role="dialog"
          aria-label="Selecionar responsaveis"
          className="absolute left-0 top-full z-20 mt-1 min-w-[220px] rounded-[10px] border border-border bg-popover p-2 text-[13px] shadow-lg"
        >
          <input
            type="search"
            placeholder="Buscar..."
            className="mb-1 w-full rounded-md border border-border bg-transparent px-2 py-1 text-[13px] outline-none focus:border-ring"
          />
          <p className="px-2 py-2 text-muted-foreground">
            TODO: lista filtravel via useUsers().
          </p>
        </div>
      )}
    </div>
  );
}
