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
              ? 'peer cursor-pointer size-3.5 shrink-0 rounded-[4px] border border-input shadow-xs transition-shadow outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 data-[state=checked]:bg-foreground data-[state=checked]:border-foreground data-[state=checked]:text-background disabled:cursor-not-allowed disabled:opacity-60'
              : 'peer size-4 shrink-0 rounded-[4px] border border-input bg-background shadow-xs transition-shadow outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 data-[state=checked]:bg-foreground data-[state=checked]:border-foreground data-[state=checked]:text-background disabled:cursor-not-allowed disabled:opacity-60'
          }
        >
          <Checkbox.Indicator className="flex items-center justify-center">
            <Check className={inline ? 'size-3' : 'size-3.5'} strokeWidth={3} />
          </Checkbox.Indicator>
        </Checkbox.Root>
      )}
    </FieldShell>
  );
}
