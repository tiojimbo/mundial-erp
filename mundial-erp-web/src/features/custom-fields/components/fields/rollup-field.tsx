'use client';

import type { BaseFieldProps } from './field-base';
import { FieldShell } from './field-shell';

function formatNumber(value: number): string {
  return value.toLocaleString('pt-BR');
}

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

export function RollupField({
  definition,
  value,
  error,
  inline,
}: BaseFieldProps<string | number | null>) {
  const cfg = definition.config as Record<string, unknown> | null | undefined;
  const isCurrency = cfg?.operation === 'sumProduct';

  let formatted = '—';
  if (value !== null && value !== undefined) {
    if (typeof value === 'number' && Number.isFinite(value)) {
      formatted = isCurrency ? formatCurrency(value) : formatNumber(value);
    } else if (typeof value !== 'number') {
      formatted = String(value);
    }
  }

  return (
    <FieldShell
      definition={definition}
      error={error}
      hint={definition.config?.hint ?? 'Calculado pelo servidor'}
      showLabel={!inline}
    >
      {(controlProps) => (
        <output
          {...controlProps}
          className={
            inline
              ? 'block w-full bg-transparent px-3 text-[13px] text-foreground'
              : 'bg-muted/40 text-sm block h-9 rounded-md border border-input px-3 leading-9 text-foreground'
          }
        >
          {formatted}
        </output>
      )}
    </FieldShell>
  );
}
