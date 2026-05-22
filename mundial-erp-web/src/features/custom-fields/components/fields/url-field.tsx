'use client';

import { useEffect, useState } from 'react';
import type { BaseFieldProps } from './field-base';
import { inputClass, inputClassInline } from './field-base';
import { FieldShell } from './field-shell';
import { useDebouncedOnChange } from './use-debounced-onchange';

/**
 * Sprint 2 (TTT-021) — Editor URL.
 *
 * `type=url` ja aciona teclado especifico em mobile. Validacao real e via
 * Zod `urlSchema` (TTT-020) + `new URL()` no backend (`validators/url.validator.ts`).
 */
export function UrlField({
  definition,
  value,
  onChange,
  readOnly,
  error,
  inline,
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
      showLabel={!inline}
    >
      {(controlProps) => (
        <input
          {...controlProps}
          type='url'
          inputMode='url'
          autoComplete='url'
          className={inline ? inputClassInline : inputClass}
          value={localValue}
          readOnly={isReadOnly}
          placeholder={inline ? '-' : 'https://exemplo.com'}
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
