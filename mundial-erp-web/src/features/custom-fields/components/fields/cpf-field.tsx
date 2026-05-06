'use client';

import { useEffect, useState } from 'react';
import type { BaseFieldProps } from './field-base';
import { inputClass } from './field-base';
import { FieldShell } from './field-shell';
import { maskCpf } from './masks';
import { useDebouncedOnChange } from './use-debounced-onchange';

/**
 * Sprint 2 (TTT-021) — Editor CPF.
 *
 * Aplica mascara `999.999.999-99` no `onChange` (visual). O valor enviado ao
 * pai mantem a mesma formatacao — backend aceita ambos formatos
 * (digitos puros ou mascarado) conforme `validators/cpf.validator.ts` que
 * normaliza antes de validar digitos verificadores.
 */
export function CpfField({
  definition,
  value,
  onChange,
  readOnly,
  error,
}: BaseFieldProps<string | null>) {
  const initial = value === null || value === undefined ? '' : maskCpf(String(value));
  const [localValue, setLocalValue] = useState<string>(initial);
  const debounced = useDebouncedOnChange<string | null>(onChange);

  useEffect(() => {
    setLocalValue(value === null || value === undefined ? '' : maskCpf(String(value)));
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
          maxLength={14}
          placeholder="000.000.000-00"
          onChange={(event) => {
            const next = maskCpf(event.target.value);
            setLocalValue(next);
            debounced(next.length === 0 ? null : next);
          }}
        />
      )}
    </FieldShell>
  );
}
