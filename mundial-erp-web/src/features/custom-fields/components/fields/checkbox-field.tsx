'use client';

import * as Checkbox from '@radix-ui/react-checkbox';
import { Check } from 'lucide-react';
import type { BaseFieldProps } from './field-base';
import { FieldShell } from './field-shell';

export function CheckboxField({
  definition,
  value,
  onChange,
  readOnly,
  error,
  inline,
}: BaseFieldProps<boolean | null>) {
  const isReadOnly = readOnly || definition.config?.readOnly === true;
  const checked = value === true;

  return (
    <FieldShell
      definition={definition}
      error={error}
      hint={definition.config?.hint}
      showLabel={!inline}
    >
      {(controlProps) => (
        <Checkbox.Root
          {...controlProps}
          checked={checked}
          disabled={isReadOnly}
          onCheckedChange={(next) => onChange(next === true)}
          className={
            inline
              ? 'shadow-xs focus-visible:ring-ring/50 peer size-3.5 shrink-0 cursor-pointer rounded-[4px] border border-input outline-none transition-shadow focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-60 data-[state=checked]:border-foreground data-[state=checked]:bg-foreground data-[state=checked]:text-background'
              : 'shadow-xs focus-visible:ring-ring/50 peer size-4 shrink-0 rounded-[4px] border border-input bg-background outline-none transition-shadow focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-60 data-[state=checked]:border-foreground data-[state=checked]:bg-foreground data-[state=checked]:text-background'
          }
        >
          <Checkbox.Indicator className='flex items-center justify-center'>
            <Check className={inline ? 'size-3' : 'size-3.5'} strokeWidth={3} />
          </Checkbox.Indicator>
        </Checkbox.Root>
      )}
    </FieldShell>
  );
}
