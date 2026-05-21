'use client';

import { useMemo, useState } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { Command } from 'cmdk';
import { Plus, Search } from 'lucide-react';

import { cn } from '@/lib/cn';
import type { BaseFieldProps } from './field-base';
import { inputClass, inputClassInline } from './field-base';
import { FieldShell } from './field-shell';

const FALLBACK_PALETTE = [
  '#7C4DFF', '#F06292', '#42A5F5', '#66BB6A',
  '#FFA726', '#26C6DA', '#EC407A', '#AB47BC',
  '#FFCA28', '#8D6E63',
];

function extractOptions(definition: BaseFieldProps['definition']): string[] {
  if (Array.isArray(definition.options) && definition.options.length > 0) {
    return definition.options
      .map((opt) => {
        if (typeof opt === 'string') return opt;
        if (typeof opt === 'object' && opt !== null && 'value' in (opt as Record<string, unknown>) && typeof (opt as { value: unknown }).value === 'string') {
          return (opt as { value: string }).value;
        }
        return null;
      })
      .filter((v): v is string => v !== null);
  }
  return (definition.config?.options ?? []).map((opt) => opt.value);
}

function colorOf(option: string, idx: number, configColors?: Record<string, string>): string {
  if (configColors && configColors[option]) return configColors[option];
  return FALLBACK_PALETTE[idx % FALLBACK_PALETTE.length];
}

export function LabelField({
  definition,
  value,
  onChange,
  readOnly,
  error,
  inline,
}: BaseFieldProps<string | null>) {
  const isReadOnly = readOnly || definition.config?.readOnly === true;
  const options = useMemo(() => extractOptions(definition), [definition]);
  const configColors = ((definition.config as Record<string, unknown> | null | undefined)?.colors ?? undefined) as Record<string, string> | undefined;
  const [open, setOpen] = useState(false);

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
            placeholder="Sem labels configurados"
          />
        )}
      </FieldShell>
    );
  }

  const selectedIdx = options.findIndex((o) => o === value);
  const selected = selectedIdx >= 0 ? options[selectedIdx] : null;
  const selectedColor = selected ? colorOf(selected, selectedIdx, configColors) : null;

  if (!inline) {
    return (
      <FieldShell definition={definition} error={error} hint={definition.config?.hint} showLabel>
        {(controlProps) => (
          <div className="flex flex-wrap gap-1.5" {...controlProps}>
            {options.map((opt, idx) => {
              const color = colorOf(opt, idx, configColors);
              const isSelected = opt === value;
              return (
                <button
                  key={opt}
                  type="button"
                  disabled={isReadOnly}
                  onClick={() => onChange(isSelected ? null : opt)}
                  className="rounded-full px-2.5 py-0.5 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-60"
                  style={{
                    backgroundColor: isSelected ? color : `${color}1f`,
                    color: isSelected ? '#fff' : color,
                  }}
                  aria-pressed={isSelected}
                >
                  {opt}
                </button>
              );
            })}
          </div>
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
              {selected ? (
                <span
                  className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
                  style={{ backgroundColor: `${selectedColor}1f`, color: selectedColor ?? undefined }}
                >
                  {selected}
                </span>
              ) : (
                <span className="text-muted-foreground/60 truncate text-[13px]">-</span>
              )}
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
                    Nenhuma tag
                  </Command.Empty>
                  <Command.Group className="w-full overflow-hidden p-2 py-1">
                    {!definition.required && (
                      <Command.Item
                        value="-"
                        onSelect={() => { onChange(null); setOpen(false); }}
                        className={cn(
                          'data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground',
                          'text-muted-foreground relative rounded-sm outline-hidden select-none',
                          'flex cursor-pointer items-center gap-2 px-3 py-1.5 text-xs',
                        )}
                      >
                        <span className="flex-1 truncate">–</span>
                      </Command.Item>
                    )}
                    {options.map((opt, idx) => {
                      const color = colorOf(opt, idx, configColors);
                      const isSelected = opt === value;
                      return (
                        <Command.Item
                          key={opt}
                          value={opt}
                          onSelect={() => { onChange(isSelected ? null : opt); setOpen(false); }}
                          className={cn(
                            'data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground',
                            'relative rounded-sm outline-hidden select-none',
                            'flex cursor-pointer items-center gap-2 px-3 py-1.5 text-xs',
                            isSelected && 'font-medium',
                          )}
                        >
                          <span
                            className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
                            style={{ backgroundColor: `${color}1f`, color }}
                          >
                            {opt}
                          </span>
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
