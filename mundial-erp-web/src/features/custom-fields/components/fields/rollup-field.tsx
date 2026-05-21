'use client';

import type { BaseFieldProps } from './field-base';
import { FieldShell } from './field-shell';

function formatValue(value: BaseFieldProps['value']): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value.toLocaleString('pt-BR') : '—';
  }
  return String(value);
}

export function RollupField({
  definition,
  value,
  error,
  inline,
}: BaseFieldProps<string | number | null>) {
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
              : 'block h-9 rounded-md border border-input bg-muted/40 px-3 text-sm leading-9 text-foreground'
          }
        >
          {formatValue(value)}
        </output>
      )}
    </FieldShell>
  );
}
