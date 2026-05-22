'use client';

import { useEffect, useState } from 'react';
import {
  QUANTITY_UNIT_ABBR,
  type QuantityUnit,
} from '../../types/custom-field.types';
import type { BaseFieldProps } from './field-base';
import { FieldShell } from './field-shell';
import { useDebouncedOnChange } from './use-debounced-onchange';

function parseQuantity(input: string): number | null {
  if (input.trim().length === 0) return null;
  const parsed = Number(
    input.replace(/[^\d,.-]/g, '').replace(',', '.'),
  );
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

export function QuantityField({
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
  const unit = (definition.config?.unit ?? 'METER2') as QuantityUnit;
  const abbr = QUANTITY_UNIT_ABBR[unit] ?? '';

  const containerClass = inline
    ? 'flex h-full w-full items-center'
    : [
        'flex h-9 w-full items-center rounded-md border bg-background px-3',
        'transition-colors focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-1',
        error ? 'border-destructive' : 'border-input',
        isReadOnly ? 'bg-muted/40' : '',
      ].join(' ');
  const sizeClass = inline ? 'text-[13px]' : 'text-sm';

  return (
    <FieldShell
      definition={definition}
      error={error}
      hint={definition.config?.hint}
      showLabel={!inline}
    >
      {(controlProps) => (
        <div className={containerClass}>
          <input
            {...controlProps}
            type="text"
            inputMode="decimal"
            size={Math.max(localValue.length, 1)}
            className={`min-w-[1ch] max-w-full bg-transparent text-foreground outline-none placeholder:text-muted-foreground/60 [field-sizing:content] ${sizeClass}`}
            value={localValue}
            readOnly={isReadOnly}
            placeholder={inline ? '-' : '0'}
            onChange={(event) => {
              const next = event.target.value;
              setLocalValue(next);
              debounced(parseQuantity(next));
            }}
          />
          <span
            aria-hidden="true"
            className={`ml-1.5 shrink-0 text-foreground ${sizeClass}`}
          >
            {abbr}
          </span>
        </div>
      )}
    </FieldShell>
  );
}
