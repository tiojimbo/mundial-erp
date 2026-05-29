'use client';

import * as React from 'react';
import { Search } from 'lucide-react';
import { Command } from 'cmdk';
import { cn } from '@/lib/cn';
import { useSidebarTree } from '@/features/navigation/hooks/use-sidebar-tree';
import type {
  SidebarDepartment,
  SidebarProcess,
} from '@/features/navigation/types/navigation.types';

export interface ListOption {
  id: string;
  name: string;
  spaceName: string;
  folderName: string | null;
}

function flattenLists(spaces: SidebarDepartment[]): ListOption[] {
  const out: ListOption[] = [];
  const pushProcess = (
    p: SidebarProcess,
    spaceName: string,
    folderName: string | null,
  ) => {
    if (p.processType !== 'LIST') return;
    out.push({ id: p.id, name: p.name, spaceName, folderName });
  };
  for (const space of spaces) {
    for (const p of space.directProcesses) pushProcess(p, space.name, null);
    for (const area of space.areas) {
      for (const p of area.processes) pushProcess(p, space.name, area.name);
    }
  }
  return out;
}

export function ListTargetSelector({
  selectedListId,
  excludeListId,
  onSelect,
}: {
  selectedListId: string | null;
  excludeListId?: string | null;
  onSelect: (option: ListOption) => void;
}) {
  const { data: tree, isLoading } = useSidebarTree();

  const grouped = React.useMemo(() => {
    const lists = flattenLists(tree ?? []).filter(
      (l) => l.id !== excludeListId,
    );
    const bySpace = new Map<string, ListOption[]>();
    for (const l of lists) {
      const arr = bySpace.get(l.spaceName) ?? [];
      arr.push(l);
      bySpace.set(l.spaceName, arr);
    }
    return [...bySpace.entries()];
  }, [tree, excludeListId]);

  return (
    <Command className='flex h-[320px] flex-col rounded-lg border border-stroke-soft-200'>
      <div className='flex items-center gap-2 border-b border-stroke-soft-200 px-3 py-2'>
        <Search className='h-3.5 w-3.5 text-text-soft-400' />
        <Command.Input
          placeholder='Buscar lista de destino...'
          className='flex-1 bg-transparent text-[13px] outline-none placeholder:text-text-soft-400'
        />
      </div>
      <Command.List className='min-h-0 flex-1 overflow-y-auto p-1'>
        {isLoading ? (
          <p className='py-6 text-center text-[12px] text-text-soft-400'>
            Carregando...
          </p>
        ) : (
          <Command.Empty className='py-6 text-center text-[12px] text-text-soft-400'>
            Nenhuma lista encontrada.
          </Command.Empty>
        )}
        {grouped.map(([spaceName, lists]) => (
          <Command.Group
            key={spaceName}
            heading={spaceName}
            className='[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-text-soft-400'
          >
            {lists.map((l) => {
              const selected = l.id === selectedListId;
              return (
                <Command.Item
                  key={l.id}
                  value={`${l.spaceName} ${l.folderName ?? ''} ${l.name}`}
                  onSelect={() => onSelect(l)}
                  className={cn(
                    'flex cursor-pointer items-center justify-between gap-2 rounded-[6px] px-2 py-1.5 text-[13px]',
                    'data-[selected=true]:bg-bg-weak-50',
                    selected && 'bg-bg-weak-50',
                  )}
                >
                  <span className='truncate text-text-strong-950'>
                    {l.name}
                  </span>
                  {l.folderName && (
                    <span className='shrink-0 truncate text-[11px] text-text-soft-400'>
                      {l.folderName}
                    </span>
                  )}
                </Command.Item>
              );
            })}
          </Command.Group>
        ))}
      </Command.List>
    </Command>
  );
}
