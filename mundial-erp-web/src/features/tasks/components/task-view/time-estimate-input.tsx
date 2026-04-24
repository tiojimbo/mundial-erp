'use client';

import { useEffect, useState } from 'react';

/**
 * Sprint 5 (TSK-150) — Time estimate input no formato "2h 30m".
 * tasks.md §4.3 linha "Tempo est.".
 *
 * Conversao: value em minutos <-> string "Xh Ym".
 */

export type TimeEstimateInputProps = {
  taskId: string;
  value: number | null;
  placeholder?: string;
  onChange?: (minutes: number | null) => void;
};

function toDisplay(minutes: number | null): string {
  if (minutes == null || minutes <= 0) return '';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
}

function fromInput(raw: string): number | null {
  const trimmed = raw.trim().toLowerCase();
  if (!trimmed) return null;
  const hMatch = trimmed.match(/(\d+)\s*h/);
  const mMatch = trimmed.match(/(\d+)\s*m/);
  const onlyNumber = /^\d+$/.test(trimmed);
  if (onlyNumber) return parseInt(trimmed, 10);
  const h = hMatch ? parseInt(hMatch[1], 10) : 0;
  const m = mMatch ? parseInt(mMatch[1], 10) : 0;
  if (!h && !m) return null;
  return h * 60 + m;
}

export function TimeEstimateInput({
  value,
  placeholder = 'Adicionar',
  onChange,
}: TimeEstimateInputProps) {
  const [editing, setEditing] = useState(false);
  const [raw, setRaw] = useState(() => toDisplay(value));

  useEffect(() => {
    setRaw(toDisplay(value));
  }, [value]);

  if (!editing && !raw) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        aria-label="Definir tempo estimado"
        className="text-[13px] font-normal text-muted-foreground/60 hover:text-muted-foreground"
      >
        {placeholder}
      </button>
    );
  }

  return (
    <input
      type="text"
      value={raw}
      aria-label="Tempo estimado"
      autoFocus={editing}
      onFocus={() => setEditing(true)}
      onChange={(e) => setRaw(e.target.value)}
      onBlur={() => {
        setEditing(false);
        onChange?.(fromInput(raw));
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.currentTarget.blur();
        }
        if (e.key === 'Escape') {
          setRaw(toDisplay(value));
          setEditing(false);
        }
      }}
      placeholder="2h 30m"
      className="w-24 rounded-md border border-transparent bg-transparent px-1 py-0.5 text-[13px] outline-none hover:border-border focus:border-ring"
    />
  );
}
