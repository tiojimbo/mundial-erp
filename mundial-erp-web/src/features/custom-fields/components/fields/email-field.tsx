'use client';

import { useEffect, useState } from 'react';
import type { BaseFieldProps } from './field-base';
import { inputClass } from './field-base';
import { FieldShell } from './field-shell';
import { useDebouncedOnChange } from './use-debounced-onchange';

/**
 * Sprint 2 (TTT-021) — Editor EMAIL.
 *
 * `type=email` para suporte de input mobile + autocompleter. Validacao
 * formal via Zod `emailSchema` (TTT-020) + regex backend simplificado.
 */
export function EmailField({
  definition,
  value,
  onChange,
  readOnly,
  error,
}: BaseFieldProps<string | null>) {
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
          type="email"
          inputMode="email"
          autoComplete="email"
          className={inputClass}
          value={localValue}
          readOnly={isReadOnly}
          placeholder="nome@exemplo.com"
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
