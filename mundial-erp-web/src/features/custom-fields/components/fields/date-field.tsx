'use client';

import { useEffect, useState } from 'react';
import type { BaseFieldProps } from './field-base';
import { inputClass } from './field-base';
import { FieldShell } from './field-shell';
import { useDebouncedOnChange } from './use-debounced-onchange';

/**
 * Sprint 2 (TTT-021) — Editor DATE.
 *
 * Usa input nativo `type=date` (UX consistente, a11y por default no SO).
 * Valor exposto ao pai e ISO 8601 (`YYYY-MM-DD` quando no formato date) ou
 * ISO completo se vier do backend com hora. Mantem string vazia como `null`.
 */
function toDateInput(value: BaseFieldProps['value']): string {
  if (value === null || value === undefined || value === '') return '';
  const asString = typeof value === 'string' ? value : String(value);
  // Se ja for ISO completo, recortar so a data — input[type=date] nao aceita time.
  if (asString.includes('T')) {
    return asString.split('T')[0] ?? '';
  }
  return asString;
}

export function DateField({
  definition,
  value,
  onChange,
  readOnly,
  error,
}: BaseFieldProps<string | null>) {
  const [localValue, setLocalValue] = useState<string>(toDateInput(value));
  const debounced = useDebouncedOnChange<string | null>(onChange);

  useEffect(() => {
    setLocalValue(toDateInput(value));
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
          type="date"
          className={inputClass}
          value={localValue}
          readOnly={isReadOnly}
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
