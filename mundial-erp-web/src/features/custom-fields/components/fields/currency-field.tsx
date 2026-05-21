'use client';

import { useEffect, useState } from 'react';
import type { BaseFieldProps } from './field-base';
import { inputClass, inputClassInline } from './field-base';
import { FieldShell } from './field-shell';
import { useDebouncedOnChange } from './use-debounced-onchange';

/**
 * Sprint 2 (TTT-021) — Editor CURRENCY (BRL).
 *
 * Aceita digitos puros + virgula/ponto. No debounce, normaliza para `number`
 * em reais (ex.: `1.234,56` -> `1234.56`). O backend converte para centavos
 * Int conforme `validators/field-type-dispatch.ts` (PLANO §"Validators").
 *
 * Affixo "R$" e renderizado via prefix nao-interativo (nao consome foco).
 */
function parseCurrency(input: string): number | null {
  if (input.trim().length === 0) return null;
  const normalized = input.replace(/[^\d,.-]/g, '').replace(/\.(?=\d{3}(\D|$))/g, '');
  const parsed = Number(normalized.replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
}

export function CurrencyField({
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
      {(controlProps) => {
        if (inline) {
          return (
            <div className="flex w-full items-center gap-1.5">
              <input
                {...controlProps}
                type="text"
                inputMode="numeric"
                className={inputClassInline}
                value={localValue}
                readOnly={isReadOnly}
                placeholder="-"
                onChange={(event) => {
                  const next = event.target.value;
                  setLocalValue(next);
                  debounced(parseCurrency(next));
                }}
              />
            </div>
          );
        }
        return (
          <div className="relative">
            <span
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground"
            >
              R$
            </span>
            <input
              {...controlProps}
              type="text"
              inputMode="decimal"
              className={`${inputClass} pl-9`}
              value={localValue}
              readOnly={isReadOnly}
              placeholder="0,00"
              onChange={(event) => {
                const next = event.target.value;
                setLocalValue(next);
                debounced(parseCurrency(next));
              }}
            />
          </div>
        );
      }}
    </FieldShell>
  );
}
