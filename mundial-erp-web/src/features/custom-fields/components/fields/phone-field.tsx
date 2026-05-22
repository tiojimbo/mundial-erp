'use client';

import { useEffect, useState } from 'react';
import type { BaseFieldProps } from './field-base';
import { inputClass, inputClassInline } from './field-base';
import { FieldShell } from './field-shell';
import { maskPhone } from './masks';
import { useDebouncedOnChange } from './use-debounced-onchange';

/**
 * Sprint 2 (TTT-021) — Editor PHONE (BR).
 *
 * Mascara dinamica `(99) 99999-9999` (celular) ou `(99) 9999-9999` (fixo).
 * Aceita +55 inicial mas formata sem ele para nao confundir o usuario.
 */
export function PhoneField({
  definition,
  value,
  onChange,
  readOnly,
  error,
  inline,
}: BaseFieldProps<string | null>) {
  const initial =
    value === null || value === undefined ? '' : maskPhone(String(value));
  const [localValue, setLocalValue] = useState<string>(initial);
  const debounced = useDebouncedOnChange<string | null>(onChange);

  useEffect(() => {
    setLocalValue(
      value === null || value === undefined ? '' : maskPhone(String(value)),
    );
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
          type='tel'
          inputMode='tel'
          autoComplete='tel-national'
          className={inline ? inputClassInline : inputClass}
          value={localValue}
          readOnly={isReadOnly}
          maxLength={16}
          placeholder={inline ? '-' : '(11) 91234-5678'}
          onChange={(event) => {
            const next = maskPhone(event.target.value);
            setLocalValue(next);
            debounced(next.length === 0 ? null : next);
          }}
        />
      )}
    </FieldShell>
  );
}
