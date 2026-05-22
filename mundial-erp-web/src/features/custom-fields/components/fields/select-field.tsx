'use client';

import { useMemo, useState } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { Command } from 'cmdk';
import { Plus, Search } from 'lucide-react';

import { cn } from '@/lib/cn';
import type { BaseFieldProps } from './field-base';
import { inputClass, inputClassInline } from './field-base';
import { FieldShell } from './field-shell';

function extractStringOptions(
  definition: BaseFieldProps['definition'],
): string[] {
  if (Array.isArray(definition.options) && definition.options.length > 0) {
    const flat = definition.options
      .map((opt) => {
        if (typeof opt === 'string') return opt;
        if (
          typeof opt === 'object' &&
          opt !== null &&
          'value' in (opt as Record<string, unknown>) &&
          typeof (opt as { value: unknown }).value === 'string'
        ) {
          return (opt as { value: string }).value;
        }
        return null;
      })
      .filter((v): v is string => v !== null);
    if (flat.length > 0) return flat;
  }
  return (definition.config?.options ?? []).map((opt) => opt.value);
}

export function SelectField({
  definition,
  value,
  onChange,
  readOnly,
  error,
  inline,
}: BaseFieldProps<string | null>) {
  const isReadOnly = readOnly || definition.config?.readOnly === true;
  const options = useMemo(() => extractStringOptions(definition), [definition]);
  const [open, setOpen] = useState(false);

  if (options.length === 0) {
    return (
      <FieldShell definition={definition} error={error} showLabel={!inline}>
        {(controlProps) => (
          <input
            {...controlProps}
            type='text'
            className={inline ? inputClassInline : inputClass}
            value=''
            disabled
            placeholder='Sem opcoes configuradas'
          />
        )}
      </FieldShell>
    );
  }

  const selected =
    typeof value === 'string' && options.includes(value) ? value : null;

  if (!inline) {
    return (
      <FieldShell
        definition={definition}
        error={error}
        hint={definition.config?.hint}
        showLabel
      >
        {(controlProps) => (
          <select
            {...controlProps}
            className={inputClass}
            value={typeof value === 'string' ? value : ''}
            disabled={isReadOnly}
            onChange={(e) =>
              onChange(e.target.value.length === 0 ? null : e.target.value)
            }
          >
            <option value=''>
              {definition.required ? 'Selecione' : 'Sem valor'}
            </option>
            {options.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        )}
      </FieldShell>
    );
  }

  return (
    <FieldShell definition={definition} error={error} showLabel={false}>
      {(controlProps) => (
        <Popover.Root open={open} onOpenChange={setOpen}>
          <Popover.Trigger asChild>
            <button
              {...controlProps}
              type='button'
              disabled={isReadOnly}
              className='flex w-full cursor-pointer items-center focus:outline-none disabled:cursor-not-allowed disabled:opacity-60'
            >
              <span
                className={cn(
                  'truncate text-[13px]',
                  selected ? 'text-foreground' : 'text-muted-foreground/60',
                )}
              >
                {selected ?? '-'}
              </span>
            </button>
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Content
              align='start'
              sideOffset={4}
              className='shadow-md z-[200] w-[200px] rounded-md border bg-popover p-0 text-popover-foreground outline-none'
            >
              <Command className='flex h-full w-full flex-col overflow-hidden rounded-md bg-popover text-popover-foreground'>
                <div className='flex h-9 items-center gap-2 border-b px-3'>
                  <Search className='size-4 shrink-0 opacity-50' />
                  <Command.Input
                    placeholder='Pesquisar...'
                    className='text-sm h-9 w-full bg-transparent py-3 outline-none placeholder:text-muted-foreground'
                  />
                </div>
                <Command.List className='max-h-[300px] scroll-py-1 overflow-y-auto overflow-x-hidden'>
                  <Command.Empty className='text-xs px-3 py-6 text-center text-muted-foreground'>
                    Nenhuma opção
                  </Command.Empty>
                  <Command.Group className='w-full overflow-hidden p-2 py-1'>
                    {!definition.required && (
                      <Command.Item
                        value='-'
                        onSelect={() => {
                          onChange(null);
                          setOpen(false);
                        }}
                        className={cn(
                          'data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground',
                          'outline-hidden relative select-none rounded-sm text-muted-foreground',
                          'text-xs flex cursor-pointer items-center gap-2 px-3 py-1.5',
                        )}
                      >
                        <span className='flex-1 truncate'>–</span>
                      </Command.Item>
                    )}
                    {options.map((opt) => {
                      const isSelected = opt === value;
                      return (
                        <Command.Item
                          key={opt}
                          value={opt}
                          onSelect={() => {
                            onChange(isSelected ? null : opt);
                            setOpen(false);
                          }}
                          className={cn(
                            'data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground',
                            'outline-hidden relative select-none rounded-sm',
                            'text-xs flex cursor-pointer items-center gap-2 px-3 py-1.5',
                            isSelected && 'font-medium',
                          )}
                        >
                          <span className='flex-1 truncate'>{opt}</span>
                        </Command.Item>
                      );
                    })}
                  </Command.Group>
                </Command.List>
                <div className='border-t p-2'>
                  <button
                    type='button'
                    className='text-xs flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  >
                    <Plus className='h-3.5 w-3.5' />
                    Criar nova opção
                  </button>
                </div>
              </Command>
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>
      )}
    </FieldShell>
  );
}
