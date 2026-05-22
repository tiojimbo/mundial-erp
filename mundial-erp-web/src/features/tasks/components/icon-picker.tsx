'use client';

import { useMemo, useState } from 'react';
import * as Popover from '@radix-ui/react-popover';
import * as LucideIcons from 'lucide-react';
import { CircleDot, Search, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';

export type IconEntry = { name: string; Icon: LucideIcon };

const seen = new Set<unknown>();
export const AVAILABLE_ICONS: IconEntry[] = Object.entries(
  LucideIcons as Record<string, unknown>,
)
  .filter(
    ([name, value]) =>
      value != null &&
      (typeof value === 'object' || typeof value === 'function') &&
      /^[A-Z]/.test(name) &&
      !name.endsWith('Icon') &&
      !name.startsWith('Lucide'),
  )
  .filter(([, value]) => {
    if (seen.has(value)) return false;
    seen.add(value);
    return true;
  })
  .map(([name, Icon]) => ({ name, Icon: Icon as LucideIcon }))
  .sort((a, b) => a.name.localeCompare(b.name));

const ICON_MAP: Record<string, LucideIcon> = Object.fromEntries(
  Object.entries(LucideIcons as Record<string, unknown>)
    .filter(
      ([name, value]) =>
        value != null &&
        (typeof value === 'object' || typeof value === 'function') &&
        /^[A-Z]/.test(name) &&
        !name.startsWith('Lucide'),
    )
    .map(([name, Icon]) => [name, Icon as LucideIcon]),
);

export function getIconByName(name?: string | null): LucideIcon {
  if (!name) return CircleDot;
  if (ICON_MAP[name]) return ICON_MAP[name];
  const stripped = name.endsWith('Icon') ? name.slice(0, -4) : `${name}Icon`;
  return ICON_MAP[stripped] ?? CircleDot;
}

type Props = {
  value?: string;
  onChange: (name: string) => void;
};

export function IconPicker({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return AVAILABLE_ICONS;
    return AVAILABLE_ICONS.filter((entry) =>
      entry.name.toLowerCase().includes(term),
    );
  }, [search]);

  const SelectedIcon = getIconByName(value);

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type='button'
          className='flex h-9 w-9 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-accent hover:text-foreground'
          aria-label='Selecionar icone'
        >
          <SelectedIcon className='h-4 w-4' />
        </button>
      </Popover.Trigger>
      <Popover.Content
        align='start'
        sideOffset={4}
        className='z-[70] w-[360px] overflow-hidden rounded-md border border-border bg-popover text-popover-foreground shadow-md'
      >
          <div className='border-b border-border p-2'>
            <div className='flex items-center gap-2 rounded-md border border-border px-2'>
              <Search
                className='h-3.5 w-3.5 text-muted-foreground'
                aria-hidden
              />
              <input
                autoFocus
                placeholder='Search...'
                className='h-8 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground'
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div className='max-h-[280px] overflow-y-auto p-2'>
            {filtered.length === 0 ? (
              <div className='py-6 text-center text-xs text-muted-foreground'>
                Nenhum icone encontrado.
              </div>
            ) : (
              <div className='grid grid-cols-8 gap-0.5'>
                {filtered.map(({ name, Icon }) => {
                  const selected = value === name;
                  return (
                    <button
                      key={name}
                      type='button'
                      onClick={() => {
                        onChange(name);
                        setOpen(false);
                      }}
                      className={cn(
                        'flex h-8 w-8 items-center justify-center rounded-md transition-colors hover:bg-accent',
                        selected && 'bg-accent text-foreground ring-1 ring-primary',
                      )}
                      aria-label={name}
                    >
                      <Icon className='h-4 w-4' />
                    </button>
                  );
                })}
              </div>
            )}
          </div>
      </Popover.Content>
    </Popover.Root>
  );
}
