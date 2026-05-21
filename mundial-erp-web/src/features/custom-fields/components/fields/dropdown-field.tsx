'use client';

import { useMemo, useState } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { Command } from 'cmdk';
import { Plus, Search } from 'lucide-react';

import { cn } from '@/lib/cn';
import type { BaseFieldProps } from './field-base';
import { inputClass, inputClassInline } from './field-base';
import { FieldShell } from './field-shell';

type DropdownOption = { value: string; label: string };

function extractOptions(definition: BaseFieldProps['definition']): DropdownOption[] {
  const rawRoot = (Array.isArray(definition.options) ? definition.options : []) as unknown[];
  const rawConfig = (Array.isArray(definition.config?.options) ? definition.config!.options : []) as unknown[];
  const raw: unknown[] = rawRoot.length > 0 ? rawRoot : rawConfig;
  const out: DropdownOption[] = [];
  for (const o of raw) {
    if (typeof o === 'string') {
      out.push({ value: o, label: o });
      continue;
    }
    if (typeof o === 'object' && o !== null && typeof (o as { value?: unknown }).value === 'string') {
      const op = o as { value: string; label?: string };
      out.push({ value: op.value, label: op.label ?? op.value });
    }
  }
  return out;
}

export function DropdownField({
  definition,
  value,
  onChange,
  readOnly,
  error,
  inline,
}: BaseFieldProps<string | null>) {
  const isReadOnly = readOnly || definition.config?.readOnly === true;
  const [open, setOpen] = useState(false);
  const options = useMemo(() => extractOptions(definition), [definition]);

  if (options.length === 0) {
    return (
      <FieldShell definition={definition} error={error} showLabel={!inline}>
        {(controlProps) => (
          <input
            {...controlProps}
            type="text"
            className={inline ? inputClassInline : inputClass}
            value=""
            disabled
            placeholder="Sem opcoes configuradas"
          />
        )}
      </FieldShell>
    );
  }

  const selected = options.find((o) => o.value === value) ?? null;

  if (!inline) {
    return (
      <FieldShell definition={definition} error={error} hint={definition.config?.hint} showLabel>
        {(controlProps) => (
          <select
            {...controlProps}
            className={inputClass}
            value={typeof value === 'string' ? value : ''}
            disabled={isReadOnly}
            onChange={(e) => onChange(e.target.value.length === 0 ? null : e.target.value)}
          >
            <option value="">{definition.required ? 'Selecione' : 'Sem valor'}</option>
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
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
              type="button"
              disabled={isReadOnly}
              className="flex w-full cursor-pointer items-center focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span
                className={cn(
                  'truncate text-[13px]',
                  selected ? 'text-foreground' : 'text-muted-foreground/60',
                )}
              >
                {selected ? selected.label : '-'}
              </span>
            </button>
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Content
              align="start"
              sideOffset={4}
              className="bg-popover text-popover-foreground z-[200] w-[200px] rounded-md border p-0 shadow-md outline-none"
            >
              <Command className="bg-popover text-popover-foreground flex h-full w-full flex-col overflow-hidden rounded-md">
                <div className="flex h-9 items-center gap-2 border-b px-3">
                  <Search className="size-4 shrink-0 opacity-50" />
                  <Command.Input
                    placeholder="Pesquisar..."
                    className="placeholder:text-muted-foreground h-9 w-full bg-transparent py-3 text-sm outline-none"
                  />
                </div>
                <Command.List className="max-h-[300px] scroll-py-1 overflow-x-hidden overflow-y-auto">
                  <Command.Empty className="text-muted-foreground px-3 py-6 text-center text-xs">
                    Nenhuma opção
                  </Command.Empty>
                  <Command.Group className="w-full overflow-hidden p-2 py-1">
                    {!definition.required && (
                      <Command.Item
                        value="-"
                        onSelect={() => {
                          onChange(null);
                          setOpen(false);
                        }}
                        className={cn(
                          'data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground',
                          'text-muted-foreground relative rounded-sm outline-hidden select-none',
                          'flex cursor-pointer items-center gap-2 px-3 py-1.5 text-xs',
                        )}
                      >
                        <span className="flex-1 truncate">–</span>
                      </Command.Item>
                    )}
                    {options.map((opt) => {
                      const isSelected = opt.value === value;
                      return (
                        <Command.Item
                          key={opt.value}
                          value={opt.label}
                          onSelect={() => {
                            onChange(isSelected ? null : opt.value);
                            setOpen(false);
                          }}
                          className={cn(
                            'data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground',
                            'relative rounded-sm outline-hidden select-none',
                            'flex cursor-pointer items-center gap-2 px-3 py-1.5 text-xs',
                            isSelected && 'font-medium',
                          )}
                        >
                          <span className="flex-1 truncate">{opt.label}</span>
                        </Command.Item>
                      );
                    })}
                  </Command.Group>
                </Command.List>
                <div className="border-t p-2">
                  <button
                    type="button"
                    className="text-muted-foreground hover:bg-accent hover:text-accent-foreground flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-xs"
                  >
                    <Plus className="h-3.5 w-3.5" />
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
