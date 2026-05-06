'use client';

import { useEffect, useState } from 'react';
import type { BaseFieldProps } from './field-base';
import { inputClass } from './field-base';
import { FieldShell } from './field-shell';
import { useDebouncedOnChange } from './use-debounced-onchange';

/**
 * Sprint 2 (TTT-021) — Editor TEXT.
 *
 * Estado controlado local (`localValue`) sincroniza com `value` externo na
 * primeira render e quando o pai trocar (ex.: server response apos optimistic).
 * Debounce 500ms via `useDebouncedOnChange` evita PATCH por keystroke.
 */
export function TextField({
  definition,
  value,
  onChange,
  readOnly,
  error,
}: BaseFieldProps<string | number | null>) {
  const initial = value === null || value === undefined ? '' : String(value);
  const [localValue, setLocalValue] = useState<string>(initial);
  const debounced = useDebouncedOnChange<string | null>(onChange);

  useEffect(() => {
    setLocalValue(value === null || value === undefined ? '' : String(value));
  }, [value]);

  const isReadOnly = readOnly || definition.config?.readOnly === true;

  return (
    <FieldShell
      definition={definition}
      error={error}
      hint={definition.config?.hint}
    >
      {(controlProps) => (
        <input
          {...controlProps}
          type="text"
          className={inputClass}
          value={localValue}
          readOnly={isReadOnly}
          placeholder={definition.label}
          onChange={(event) => {
            const next = event.target.value;
            setLocalValue(next);
            debounced(next.length === 0 ? null : next);
          }}
        />
      )}
    </FieldShell>
  );
}
