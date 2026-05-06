'use client';

import { useEffect, useState } from 'react';
import type { BaseFieldProps } from './field-base';
import { inputClass } from './field-base';
import { FieldShell } from './field-shell';
import { maskCnpj } from './masks';
import { useDebouncedOnChange } from './use-debounced-onchange';

/**
 * Sprint 2 (TTT-021) — Editor CNPJ.
 *
 * Mascara `99.999.999/9999-99` aplicada inline. Backend aceita formatos
 * com ou sem mascara (`validators/cnpj.validator.ts`).
 */
export function CnpjField({
  definition,
  value,
  onChange,
  readOnly,
  error,
}: BaseFieldProps<string | null>) {
  const initial = value === null || value === undefined ? '' : maskCnpj(String(value));
  const [localValue, setLocalValue] = useState<string>(initial);
  const debounced = useDebouncedOnChange<string | null>(onChange);

  useEffect(() => {
    setLocalValue(value === null || value === undefined ? '' : maskCnpj(String(value)));
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
          inputMode="numeric"
          autoComplete="off"
          className={inputClass}
          value={localValue}
          readOnly={isReadOnly}
          maxLength={18}
          placeholder="00.000.000/0000-00"
          onChange={(event) => {
            const next = maskCnpj(event.target.value);
            setLocalValue(next);
            debounced(next.length === 0 ? null : next);
          }}
        />
      )}
    </FieldShell>
  );
}
