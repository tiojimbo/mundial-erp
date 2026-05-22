'use client';

import { useEffect, useState } from 'react';
import type { BaseFieldProps } from './field-base';
import { inputClass, inputClassInline } from './field-base';
import { FieldShell } from './field-shell';
import { useDebouncedOnChange } from './use-debounced-onchange';

export function PercentageField({
  definition,
  value,
  onChange,
  readOnly,
  error,
  inline,
}: BaseFieldProps<number | null>) {
  const initial = value === null || value === undefined ? '' : String(value);
  const [localValue, setLocalValue] = useState<string>(initial);
  const debounced = useDebouncedOnChange<number | null>(onChange);

  useEffect(() => {
    setLocalValue(value === null || value === undefined ? '' : String(value));
  }, [value]);

  const isReadOnly = readOnly || definition.config?.readOnly === true;
  const min = definition.config?.min ?? 0;
  const max = definition.config?.max ?? 100;

  return (
    <FieldShell
      definition={definition}
      error={error}
      hint={definition.config?.hint}
      showLabel={!inline}
    >
      {(controlProps) => (
        <div className='relative flex items-center'>
          <input
            {...controlProps}
            type='number'
            inputMode='decimal'
            className={inline ? inputClassInline : inputClass}
            value={localValue}
            readOnly={isReadOnly}
            min={min}
            max={max}
            step={0.01}
            placeholder={`${min} a ${max}`}
            onChange={(event) => {
              const raw = event.target.value;
              setLocalValue(raw);
              if (raw === '') {
                debounced(null);
                return;
              }
              const parsed = Number(raw);
              debounced(Number.isFinite(parsed) ? parsed : null);
            }}
          />
          <span
            aria-hidden='true'
            className='text-xs pointer-events-none absolute right-3 text-muted-foreground'
          >
            %
          </span>
        </div>
      )}
    </FieldShell>
  );
}
