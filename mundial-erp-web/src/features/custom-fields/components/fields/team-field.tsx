'use client';

import { useEffect, useState } from 'react';
import type { BaseFieldProps } from './field-base';
import { inputClass, inputClassInline } from './field-base';
import { FieldShell } from './field-shell';
import { useDebouncedOnChange } from './use-debounced-onchange';

export function TeamField({
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
      hint={definition.config?.hint ?? 'ID do time (cuid/uuid)'}
      showLabel={!inline}
    >
      {(controlProps) => (
        <input
          {...controlProps}
          type='text'
          className={inline ? inputClassInline : inputClass}
          value={localValue}
          readOnly={isReadOnly}
          placeholder={inline ? '-' : 'ID do time'}
          onChange={(event) => {
            const next = event.target.value.trim();
            setLocalValue(event.target.value);
            debounced(next.length === 0 ? null : next);
          }}
        />
      )}
    </FieldShell>
  );
}
