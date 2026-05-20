'use client';

import { useEffect, useState } from 'react';
import * as Select from '@radix-ui/react-select';
import { Check, ChevronDown } from 'lucide-react';

import { cn } from '@/lib/cn';
import type { BaseFieldProps } from './field-base';
import { inputClass } from './field-base';
import { FieldShell } from './field-shell';
import { useDebouncedOnChange } from './use-debounced-onchange';

/**
 * Sprint 2 (TTT-021) — Editor DROPDOWN.
 *
 * Picker com chips coloridos (paridade Hoppe). Acessibilidade via Radix Select
 * (keyboard, screen reader, focus). Empty/clear via item sentinela `__none__`
 * — Radix nao aceita value="" em Item.
 */

const NONE_VALUE = '__none__';

const FALLBACK_PALETTE = [
  '#7C4DFF',
  '#F06292',
  '#42A5F5',
  '#66BB6A',
  '#FFA726',
  '#26C6DA',
  '#EC407A',
  '#AB47BC',
  '#FFCA28',
  '#8D6E63',
];

type DropdownOption = { value: string; label: string; color?: string };

function resolveColor(opt: DropdownOption, idx: number): string {
  if (opt.color && opt.color.length > 0) return opt.color;
  return FALLBACK_PALETTE[idx % FALLBACK_PALETTE.length];
}

export function DropdownField({
  definition,
  value,
  onChange,
  readOnly,
  error,
}: BaseFieldProps<string | null>) {
  const initial = value === null || value === undefined ? '' : String(value);
  const [localValue, setLocalValue] = useState<string>(initial);
  const debounced = useDebouncedOnChange<string | null>(onChange);

  useEffect(() => {
    setLocalValue(value === null || value === undefined ? '' : String(value));
  }, [value]);

  const isReadOnly = readOnly || definition.config?.readOnly === true;
  const options = (definition.config?.options ?? []) as DropdownOption[];

  if (options.length === 0) {
    return (
      <FieldShell definition={definition} error={error}>
        {(controlProps) => (
          <input
            {...controlProps}
            type='text'
            className={inputClass}
            value=''
            disabled
            placeholder='Sem opcoes configuradas'
          />
        )}
      </FieldShell>
    );
  }

  const selectedIdx = options.findIndex((o) => o.value === localValue);
  const selected = selectedIdx >= 0 ? options[selectedIdx] : null;
  const selectedColor = selected ? resolveColor(selected, selectedIdx) : null;

  return (
    <FieldShell
      definition={definition}
      error={error}
      hint={definition.config?.hint}
    >
      {(controlProps) => (
        <Select.Root
          value={localValue.length > 0 ? localValue : undefined}
          disabled={isReadOnly}
          onValueChange={(next) => {
            const resolved = next === NONE_VALUE ? '' : next;
            setLocalValue(resolved);
            debounced(resolved.length === 0 ? null : resolved);
          }}
        >
          <Select.Trigger
            {...controlProps}
            className={cn(
              inputClass,
              'flex items-center justify-between gap-2 text-left disabled:opacity-50',
            )}
          >
            <Select.Value
              placeholder={definition.required ? 'Selecione' : 'Sem valor'}
            >
              {selected ? (
                <span className='flex min-w-0 items-center gap-2'>
                  <span
                    aria-hidden='true'
                    className='size-3 shrink-0 rounded-full'
                    style={{ backgroundColor: selectedColor ?? undefined }}
                  />
                  <span className='truncate'>{selected.label}</span>
                </span>
              ) : null}
            </Select.Value>
            <Select.Icon>
              <ChevronDown className='h-3.5 w-3.5 text-muted-foreground' />
            </Select.Icon>
          </Select.Trigger>

          <Select.Portal>
            <Select.Content
              position='popper'
              sideOffset={4}
              className='bg-popover z-50 min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-md border shadow-regular-md'
            >
              <Select.Viewport className='max-h-72 overflow-auto p-1'>
                {!definition.required ? (
                  <Select.Item
                    value={NONE_VALUE}
                    className='hover:bg-accent data-[highlighted]:bg-accent flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left text-paragraph-sm outline-none'
                  >
                    <span aria-hidden='true' className='size-3 shrink-0' />
                    <Select.ItemText>Sem valor</Select.ItemText>
                  </Select.Item>
                ) : null}
                {options.map((opt, idx) => {
                  const color = resolveColor(opt, idx);
                  const isSelected = opt.value === localValue;
                  return (
                    <Select.Item
                      key={opt.value}
                      value={opt.value}
                      className='hover:bg-accent data-[highlighted]:bg-accent flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left text-paragraph-sm outline-none'
                    >
                      <span
                        aria-hidden='true'
                        className='size-3 shrink-0 rounded-full'
                        style={{ backgroundColor: color }}
                      />
                      <Select.ItemText>{opt.label}</Select.ItemText>
                      {isSelected ? (
                        <Check className='ml-auto h-3.5 w-3.5 shrink-0' />
                      ) : null}
                    </Select.Item>
                  );
                })}
              </Select.Viewport>
            </Select.Content>
          </Select.Portal>
        </Select.Root>
      )}
    </FieldShell>
  );
}
