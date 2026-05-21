'use client';

import { useEffect, useState } from 'react';
import type { BaseFieldProps } from './field-base';
import { inputClass, inputClassInline } from './field-base';
import { FieldShell } from './field-shell';
import { useDebouncedOnChange } from './use-debounced-onchange';

const MS_PER_HOUR = 3_600_000;

function msToHours(ms: number | null): string {
  if (ms === null || !Number.isFinite(ms)) return '';
  if (ms === 0) return '';
  const hours = ms / MS_PER_HOUR;
  return Number.isInteger(hours) ? String(hours) : hours.toFixed(2).replace(/\.?0+$/, '');
}

function hoursToMs(raw: string): number | null {
  if (raw.trim().length === 0) return null;
  const n = Number(raw.replace(',', '.'));
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * MS_PER_HOUR);
}

export function DurationField({
  definition,
  value,
  onChange,
  readOnly,
  error,
  inline,
}: BaseFieldProps<number | null>) {
  const [localValue, setLocalValue] = useState<string>(
    msToHours(typeof value === 'number' ? value : null),
  );
  const debounced = useDebouncedOnChange<number | null>(onChange);

  useEffect(() => {
    setLocalValue(msToHours(typeof value === 'number' ? value : null));
  }, [value]);

  const isReadOnly = readOnly || definition.config?.readOnly === true;

  return (
    <FieldShell
      definition={definition}
      error={error}
      hint={inline ? undefined : definition.config?.hint}
      showLabel={!inline}
    >
      {(controlProps) => (
        <input
          {...controlProps}
          type="number"
          min={0}
          className={inline ? inputClassInline : inputClass}
          value={localValue}
          readOnly={isReadOnly}
          placeholder="0h"
          onChange={(event) => {
            const next = event.target.value;
            setLocalValue(next);
            debounced(hoursToMs(next));
          }}
        />
      )}
    </FieldShell>
  );
}
