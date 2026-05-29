'use client';

import { useState, useMemo } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { Command } from 'cmdk';
import { Check, Search, UserPlus } from 'lucide-react';

import { cn } from '@/lib/cn';
import { useWorkspaceStore } from '@/stores/workspace.store';
import { useWorkspaceUsers } from '@/features/workspaces/hooks/use-workspace-members';
import type { BaseFieldProps } from './field-base';
import { inputClass } from './field-base';
import { FieldShell } from './field-shell';

type NormalizedMember = {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
};

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const AVATAR_COLORS = [
  { bg: 'rgb(217, 119, 6)', fg: 'rgb(255, 255, 255)' },
  { bg: 'rgb(220, 38, 38)', fg: 'rgb(255, 255, 255)' },
  { bg: 'rgb(124, 58, 237)', fg: 'rgb(255, 255, 255)' },
  { bg: 'rgb(37, 99, 235)', fg: 'rgb(255, 255, 255)' },
  { bg: 'rgb(5, 150, 105)', fg: 'rgb(255, 255, 255)' },
  { bg: 'rgb(219, 39, 119)', fg: 'rgb(255, 255, 255)' },
];

function colorOf(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1)
    hash = (hash * 31 + id.charCodeAt(i)) | 0;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function parseIds(raw: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const piece of raw.split(/[\s,]+/)) {
    const id = piece.trim();
    if (id.length === 0 || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

export function PeopleField({
  definition,
  value,
  onChange,
  readOnly,
  error,
  inline,
}: BaseFieldProps<string[] | null>) {
  const isReadOnly = readOnly || definition.config?.readOnly === true;
  const workspaceId = useWorkspaceStore((s) => s.currentWorkspace?.id ?? '');
  const { data: members } = useWorkspaceUsers(workspaceId);
  const [open, setOpen] = useState(false);
  const normalizedMembers = useMemo<NormalizedMember[]>(
    () =>
      (members?.users ?? []).map((m) => ({
        id: m.id,
        name: m.name ?? '',
        email: m.email ?? '',
        avatarUrl: m.avatar,
      })),
    [members],
  );
  const selectedIds = useMemo(
    () => new Set(Array.isArray(value) ? value : []),
    [value],
  );
  const selectedMembers = useMemo(
    () => normalizedMembers.filter((m) => selectedIds.has(m.id)),
    [normalizedMembers, selectedIds],
  );

  if (!inline) {
    return (
      <FieldShell
        definition={definition}
        error={error}
        hint={definition.config?.hint ?? 'IDs separados por virgula ou espaco'}
        showLabel
      >
        {(controlProps) => (
          <textarea
            {...controlProps}
            className={`${inputClass} min-h-[60px] py-2`}
            value={Array.isArray(value) ? value.join(', ') : ''}
            readOnly={isReadOnly}
            placeholder='usuario-1, usuario-2'
            onChange={(event) => {
              const ids = parseIds(event.target.value);
              onChange(ids.length === 0 ? null : ids);
            }}
          />
        )}
      </FieldShell>
    );
  }

  const toggle = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    const arr = Array.from(next);
    onChange(arr.length === 0 ? null : arr);
  };

  return (
    <FieldShell definition={definition} error={error} showLabel={false}>
      {(controlProps) => (
        <Popover.Root open={open} onOpenChange={setOpen}>
          <Popover.Trigger asChild>
            <button
              {...controlProps}
              type='button'
              disabled={isReadOnly}
              className='flex w-full cursor-pointer items-center gap-1 py-0.5 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60'
            >
              {selectedMembers.length > 0 ? (
                <div className='flex items-center -space-x-1.5'>
                  {selectedMembers.slice(0, 5).map((m) => (
                    <Avatar key={m.id} member={m} ring />
                  ))}
                  {selectedMembers.length > 5 && (
                    <span className='relative flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground ring-2 ring-background'>
                      +{selectedMembers.length - 5}
                    </span>
                  )}
                </div>
              ) : (
                <span className='text-xs flex items-center gap-1.5 text-muted-foreground'>
                  <UserPlus className='h-3.5 w-3.5' />
                  Adicionar pessoa
                </span>
              )}
            </button>
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Content
              align='start'
              sideOffset={4}
              className='shadow-md z-50 w-[300px] rounded-md border bg-popover p-0 text-popover-foreground outline-none'
            >
              <Command className='flex h-full w-full flex-col overflow-hidden rounded-md bg-transparent text-popover-foreground'>
                <div className='flex h-9 items-center gap-2 border-b px-3'>
                  <Search className='h-4 w-4 shrink-0 opacity-50' />
                  <Command.Input
                    placeholder='Buscar membros...'
                    className='text-sm h-10 w-full bg-transparent py-3 outline-none placeholder:text-muted-foreground'
                  />
                </div>
                <Command.List className='max-h-[300px] scroll-py-1 overflow-y-auto overflow-x-hidden'>
                  <Command.Empty className='text-sm px-3 py-6 text-center text-muted-foreground'>
                    Nenhum membro encontrado
                  </Command.Empty>
                  <Command.Group className='overflow-hidden p-1'>
                    {normalizedMembers.map((m) => {
                      const isSelected = selectedIds.has(m.id);
                      return (
                        <Command.Item
                          key={m.id}
                          value={`${m.name} ${m.email}`}
                          onSelect={() => toggle(m.id)}
                          className={cn(
                            'data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground',
                            'text-sm relative flex cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 outline-none',
                          )}
                        >
                          <div className='flex w-full items-center gap-2'>
                            <Avatar member={m} />
                            <div className='min-w-0 flex-1'>
                              <p className='text-sm truncate font-medium'>
                                {m.name}
                              </p>
                              <p className='text-xs truncate text-muted-foreground'>
                                {m.email}
                              </p>
                            </div>
                            {isSelected && (
                              <Check className='h-4 w-4 shrink-0' />
                            )}
                          </div>
                        </Command.Item>
                      );
                    })}
                  </Command.Group>
                </Command.List>
              </Command>
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>
      )}
    </FieldShell>
  );
}

function Avatar({
  member,
  ring,
}: {
  member: NormalizedMember;
  ring?: boolean;
}) {
  const c = colorOf(member.id);
  const ringCls = ring ? 'ring-background ring-2' : '';
  if (member.avatarUrl) {
    return (
      <span
        className={`relative flex h-6 w-6 shrink-0 overflow-hidden rounded-full ${ringCls}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={member.avatarUrl}
          alt={member.name}
          className='h-full w-full object-cover'
        />
      </span>
    );
  }
  return (
    <span
      className={`relative flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold ${ringCls}`}
      style={{ backgroundColor: c.bg, color: c.fg }}
    >
      {initialsOf(member.name)}
    </span>
  );
}
