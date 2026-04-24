'use client';

import { useState } from 'react';
import { Flag } from 'lucide-react';

import type { TaskPriority } from '../../types/task.types';

/**
 * Sprint 5 (TSK-150) — Priority picker com Flag + dropdown.
 * tasks.md §4.3 (linha Prioridade).
 *
 * TODO Sprint 5.1: trocar dropdown inline por Popover Command (shadcn) com
 * teclado navegavel, conforme §7 "Popovers de propriedade".
 */

export type PriorityPickerProps = {
  taskId: string;
  value: TaskPriority;
  placeholder?: string;
  onChange?: (next: TaskPriority) => void;
};

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  URGENT: 'oklch(58% 0.19 25)',
  HIGH: 'oklch(72% 0.17 60)',
  NORMAL: 'oklch(70% 0.14 230)',
  LOW: 'oklch(70% 0.02 260)',
  NONE: 'oklch(80% 0 0)',
};

const PRIORITY_LABELS: Record<TaskPriority, string> = {
  URGENT: 'Urgente',
  HIGH: 'Alta',
  NORMAL: 'Normal',
  LOW: 'Baixa',
  NONE: 'Nenhuma',
};

const PRIORITIES: TaskPriority[] = ['URGENT', 'HIGH', 'NORMAL', 'LOW', 'NONE'];

export function PriorityPicker({
  value,
  placeholder = 'Vazio',
  onChange,
}: PriorityPickerProps) {
  const [open, setOpen] = useState(false);

  if (value === 'NONE') {
    return (
      <button
        type="button"
        aria-label="Definir prioridade"
        onClick={() => setOpen((v) => !v)}
        className="text-[13px] font-normal text-muted-foreground/60 hover:text-muted-foreground"
      >
        {placeholder}
      </button>
    );
  }

  return (
    <div className="relative inline-flex">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Prioridade atual: ${PRIORITY_LABELS[value]}`}
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-[13px] transition-colors hover:bg-muted"
      >
        <Flag
          className="h-3.5 w-3.5"
          style={{ color: PRIORITY_COLORS[value], fill: PRIORITY_COLORS[value] }}
        />
        <span>{PRIORITY_LABELS[value]}</span>
      </button>
      {open && (
        <ul
          role="listbox"
          aria-label="Prioridades"
          className="absolute left-0 top-full z-20 mt-1 flex min-w-[160px] flex-col rounded-[10px] border border-border bg-popover p-1 shadow-lg"
        >
          {PRIORITIES.map((p) => (
            <li key={p}>
              <button
                type="button"
                role="option"
                aria-selected={p === value}
                onClick={() => {
                  onChange?.(p);
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] hover:bg-muted"
              >
                <Flag
                  className="h-3.5 w-3.5"
                  style={{ color: PRIORITY_COLORS[p], fill: PRIORITY_COLORS[p] }}
                />
                {PRIORITY_LABELS[p]}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
