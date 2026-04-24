'use client';

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';

/**
 * Sprint 5 (TSK-150) — Titulo da tarefa.
 * tasks.md §4.2 — textarea transparente 24px bold auto-expand,
 * debounce 500ms, indicador "Salvando...".
 *
 * Integracao com `useUpdateTask` (hook Henrique). Caso ainda nao exportado,
 * ver TODO abaixo. Marcado como `<h1>` para a11y (WAI-ARIA §8).
 */

export type TaskTitleProps = {
  taskId: string;
  initialValue: string;
  onPersist?: (next: string) => Promise<void>;
  readOnly?: boolean;
};

const DEBOUNCE_MS = 500;

export function TaskTitle({
  taskId: _taskId,
  initialValue,
  onPersist,
  readOnly = false,
}: TaskTitleProps) {
  const [value, setValue] = useState(initialValue);
  const [saving, setSaving] = useState<'idle' | 'saving' | 'saved'>('idle');
  const ref = useRef<HTMLTextAreaElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-expand
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  // Sync externo
  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  const schedulePersist = useCallback(
    (next: string) => {
      if (!onPersist) return;
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(async () => {
        setSaving('saving');
        try {
          await onPersist(next);
          setSaving('saved');
          setTimeout(() => setSaving('idle'), 1200);
        } catch {
          setSaving('idle');
        }
      }, DEBOUNCE_MS);
    },
    [onPersist],
  );

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <div className="relative">
      <h1 className="sr-only">{value || 'Tarefa sem titulo'}</h1>
      <textarea
        ref={ref}
        value={value}
        readOnly={readOnly}
        onChange={(e) => {
          setValue(e.target.value);
          schedulePersist(e.target.value);
        }}
        placeholder="Titulo da tarefa"
        aria-label="Titulo da tarefa"
        rows={1}
        className="w-full resize-none bg-transparent text-[24px] font-bold leading-[1.25] text-foreground outline-none placeholder:text-muted-foreground/60 focus-visible:ring-2 focus-visible:ring-ring/50"
      />
      {saving !== 'idle' && (
        <span
          aria-live="polite"
          className="absolute -top-2 right-0 text-[11px] text-muted-foreground"
        >
          {saving === 'saving' ? 'Salvando...' : 'Salvo'}
        </span>
      )}
    </div>
  );
}
