'use client';

import { useEffect, useState } from 'react';
import type { BaseFieldProps } from './field-base';
import { inputClass, inputClassInline } from './field-base';
import { FieldShell } from './field-shell';
import { useDebouncedOnChange } from './use-debounced-onchange';

/**
 * Sprint 2 (TTT-021) — Editor NUMBER.
 *
 * Mantemos o input controlado como string para preservar UX de digitacao
 * (ex.: usuario apaga e redigita). `parse()` converte para `number | null`
 * apenas no debounce — assim o pai nao recebe estados intermediarios
 * invalidos. Min/max do `config` sao apenas sugestoes ao browser; a Zod
 * schema do TTT-020 impoe os limites antes de gravar.
 */
export function NumberField({
  definition,
  value,
  onChange,
  readOnly,
  error,
  inline,
}: BaseFieldProps<number | string | null>) {
  const initial = value === null || value === undefined ? '' : String(value);
  const [localValue, setLocalValue] = useState<string>(initial);
  const debounced = useDebouncedOnChange<number | null>(onChange);

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
          type="number"
          inputMode="decimal"
          className={inline ? inputClassInline : inputClass}
          value={localValue}
          readOnly={isReadOnly}
          min={definition.config?.min}
          max={definition.config?.max}
          placeholder={inline ? '-' : definition.name}
          onChange={(event) => {
            const next = event.target.value;
            setLocalValue(next);
            const parsed = next.length === 0 ? null : Number(next);
            if (parsed === null || Number.isFinite(parsed)) {
              debounced(parsed);
            }
          }}
        />
      )}
    </FieldShell>
  );
}
