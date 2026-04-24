'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, X } from 'lucide-react';

import type { TaskTag } from '../../types/task.types';

/**
 * Sprint 5 (TSK-150) — Tag picker com pills coloridos + popover inline create.
 * tasks.md §4.3 linha "Tags".
 *
 * Inline create: debounce 300ms antes de listar "Criar 'X'".
 * TODO Sprint 5.1: integrar `useTags()` + `useCreateTag()` do Henrique.
 */

export type TagPickerProps = {
  taskId: string;
  tags: TaskTag[];
  placeholder?: string;
  onAdd?: (tagId: string) => void;
  onRemove?: (tagId: string) => void;
  onCreate?: (name: string) => void;
};

const DEBOUNCE_MS = 300;

export function TagPicker({
  tags,
  placeholder = 'Adicionar',
  onRemove,
  onCreate,
}: TagPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setDebouncedQuery(query), DEBOUNCE_MS);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [query]);

  const canCreate = useMemo(
    () =>
      debouncedQuery.trim().length > 0 &&
      !tags.some(
        (t) => t.name.toLowerCase() === debouncedQuery.trim().toLowerCase(),
      ),
    [debouncedQuery, tags],
  );

  return (
    <div className="relative inline-flex flex-wrap items-center gap-1">
      {tags.map((tag) => (
        <span
          key={tag.id}
          className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium"
          style={{
            background: `color-mix(in oklch, ${tag.color} 15%, transparent)`,
            color: tag.color,
          }}
        >
          {tag.name}
          <button
            type="button"
            onClick={() => onRemove?.(tag.id)}
            aria-label={`Remover tag ${tag.name}`}
            className="opacity-60 hover:opacity-100"
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Adicionar tag"
        aria-expanded={open}
        className="inline-flex items-center gap-1 text-[13px] text-muted-foreground/60 hover:text-muted-foreground"
      >
        {tags.length === 0 ? (
          placeholder
        ) : (
          <>
            <Plus className="h-3 w-3" />
          </>
        )}
      </button>
      {open && (
        <div
          role="dialog"
          aria-label="Selecionar tags"
          className="absolute left-0 top-full z-20 mt-1 min-w-[200px] rounded-[10px] border border-border bg-popover p-2 text-[13px] shadow-lg"
        >
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar ou criar..."
            aria-label="Buscar ou criar tag"
            className="mb-1 w-full rounded-md border border-border bg-transparent px-2 py-1 text-[13px] outline-none focus:border-ring"
          />
          {canCreate && (
            <button
              type="button"
              onClick={() => {
                onCreate?.(debouncedQuery.trim());
                setQuery('');
                setOpen(false);
              }}
              className="flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left hover:bg-muted"
            >
              <Plus className="h-3.5 w-3.5" />
              Criar &ldquo;{debouncedQuery.trim()}&rdquo;
            </button>
          )}
        </div>
      )}
    </div>
  );
}
