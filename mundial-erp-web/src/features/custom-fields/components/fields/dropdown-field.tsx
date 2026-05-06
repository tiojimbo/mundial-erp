'use client';

import { useEffect, useState } from 'react';
import type { BaseFieldProps } from './field-base';
import { inputClass } from './field-base';
import { FieldShell } from './field-shell';
import { useDebouncedOnChange } from './use-debounced-onchange';

/**
 * Sprint 2 (TTT-021) — Editor DROPDOWN.
 *
 * Usa `<select>` nativo (a11y por default em todas plataformas, sem dep de
 * portal/popover). `aria-invalid` e `aria-describedby` sao aplicados ao
 * elemento, alinhado ao restante dos editores.
 *
 * Quando `definition.config.options` esta vazio, exibe placeholder informativo
 * em vez de `<select>` vazio (evita "selectionStart of null" em a11y testers).
 */
export function DropdownField({
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
  const options = definition.config?.options ?? [];

  if (options.length === 0) {
    return (
      <FieldShell definition={definition} error={error}>
        {(controlProps) => (
          <input
            {...controlProps}
            type="text"
            className={inputClass}
            value=""
            disabled
            placeholder="Sem opcoes configuradas"
          />
        )}
      </FieldShell>
    );
  }

  return (
    <FieldShell
      definition={definition}
      error={error}
      hint={definition.config?.hint}
    >
      {(controlProps) => (
        <select
          {...controlProps}
          className={inputClass}
          value={localValue}
          disabled={isReadOnly}
          onChange={(event) => {
            const next = event.target.value;
            setLocalValue(next);
            debounced(next.length === 0 ? null : next);
          }}
        >
          <option value="">{definition.required ? 'Selecione' : 'Sem valor'}</option>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      )}
    </FieldShell>
  );
}
