'use client';

import { useState } from 'react';
import { Calendar as CalendarIcon } from 'lucide-react';

/**
 * Sprint 5 (TSK-150) — DateRangePicker com startDate + dueDate.
 * tasks.md §4.3 linha "Datas".
 *
 * TODO Sprint 5.1: integrar `react-day-picker` (shadcn Calendar) em popover,
 * ver `@/components/ui/datepicker`.
 */

export type DateRangePickerProps = {
  taskId: string;
  startDate: string | null;
  dueDate: string | null;
  placeholder?: string;
  onChange?: (range: { startDate: string | null; dueDate: string | null }) => void;
};

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

export function DateRangePicker({
  startDate,
  dueDate,
  placeholder = 'Adicionar',
}: DateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const s = formatDate(startDate);
  const d = formatDate(dueDate);
  const label =
    s && d ? `${s} - ${d}` : s ? `Inicio ${s}` : d ? `Vence ${d}` : null;

  if (!label) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Definir datas"
        className="flex items-center gap-1.5 text-[13px] font-normal text-muted-foreground/60 hover:text-muted-foreground"
      >
        <CalendarIcon className="h-3.5 w-3.5" />
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
        aria-label={`Datas: ${label}`}
        className="flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-[13px] text-foreground transition-colors hover:bg-muted"
      >
        <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground" />
        <span>{label}</span>
      </button>
      {open && (
        <div
          role="dialog"
          aria-label="Selecionar datas"
          className="absolute left-0 top-full z-20 mt-1 rounded-[10px] border border-border bg-popover p-3 text-[13px] shadow-lg"
        >
          <p className="text-muted-foreground">
            TODO: react-day-picker em modo range.
          </p>
        </div>
      )}
    </div>
  );
}
