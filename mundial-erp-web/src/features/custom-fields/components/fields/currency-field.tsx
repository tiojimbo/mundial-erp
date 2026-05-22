'use client';

import { useEffect, useState } from 'react';
import type { BaseFieldProps } from './field-base';
import { inputClass, inputClassInline } from './field-base';
import { FieldShell } from './field-shell';
import { useDebouncedOnChange } from './use-debounced-onchange';

function parseCurrency(input: string): number | null {
  if (input.trim().length === 0) return null;
  const normalized = input
    .replace(/[^\d,.-]/g, '')
    .replace(/\.(?=\d{3}(\D|$))/g, ''); // descarta separador de milhar
  const parsed = Number(normalized.replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
}

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function toNumber(value: number | string | null): number | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  return parseCurrency(value);
}

function formatCurrency(value: number | string | null): string {
  const num = toNumber(value);
  return num === null ? '' : currencyFormatter.format(num);
}

function toEditable(value: number | string | null): string {
  const num = toNumber(value);
  return num === null ? '' : num.toFixed(2).replace('.', ',');
}

export function CurrencyField({
  definition,
  value,
  onChange,
  readOnly,
  error,
  inline,
}: BaseFieldProps<number | string | null>) {
  const [focused, setFocused] = useState(false);
  const [localValue, setLocalValue] = useState<string>(() => toEditable(value));
  const debounced = useDebouncedOnChange<number | null>(onChange);

  useEffect(() => {
    if (!focused) setLocalValue(toEditable(value));
  }, [value, focused]);

  const isReadOnly = readOnly || definition.config?.readOnly === true;
  const displayValue = focused ? localValue : formatCurrency(value);

  function handleChange(next: string) {
    setLocalValue(next);
    debounced(parseCurrency(next));
  }

  function handleFocus() {
    setLocalValue(toEditable(value));
    setFocused(true);
  }

  function handleBlur() {
    setFocused(false);
    onChange(parseCurrency(localValue));
  }

  return (
    <FieldShell
      definition={definition}
      error={error}
      hint={definition.config?.hint}
      showLabel={!inline}
    >
      {(controlProps) => {
        if (inline) {
          return (
            <div className="flex w-full items-center gap-1">
              {displayValue.length > 0 ? (
                <span
                  aria-hidden="true"
                  className="shrink-0 text-[13px] text-foreground"
                >
                  R$
                </span>
              ) : null}
              <input
                {...controlProps}
                type="text"
                inputMode="decimal"
                className={inputClassInline}
                value={displayValue}
                readOnly={isReadOnly}
                placeholder="-"
                onChange={(event) => handleChange(event.target.value)}
                onFocus={handleFocus}
                onBlur={handleBlur}
              />
            </div>
          );
        }
        return (
          <div className="relative">
            <span
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-foreground"
            >
              R$
            </span>
            <input
              {...controlProps}
              type="text"
              inputMode="decimal"
              className={`${inputClass} pl-9`}
              value={displayValue}
              readOnly={isReadOnly}
              placeholder="0,00"
              onChange={(event) => handleChange(event.target.value)}
              onFocus={handleFocus}
              onBlur={handleBlur}
            />
          </div>
        );
      }}
    </FieldShell>
  );
}
