'use client';

import * as React from 'react';
import {
  Search,
  ChevronRight,
  Folder,
  List as ListIcon,
  Check,
} from 'lucide-react';
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

interface FolderNode {
  id: string;
  name: string;
  lists: ListOption[];
}

interface SpaceNode {
  id: string;
  name: string;
  directLists: ListOption[];
  folders: FolderNode[];
}

function buildTree(spaces: SidebarDepartment[]): SpaceNode[] {
  const toList = (
    p: SidebarProcess,
    spaceName: string,
    folderName: string | null,
  ): ListOption | null =>
    p.processType === 'LIST'
      ? { id: p.id, name: p.name, spaceName, folderName }
      : null;

  return spaces.map((space) => ({
    id: space.id,
    name: space.name,
    directLists: space.directProcesses
      .map((p) => toList(p, space.name, null))
      .filter((x): x is ListOption => x !== null),
    folders: space.areas.map((area) => ({
      id: area.id,
      name: area.name,
      lists: area.processes
        .map((p) => toList(p, space.name, area.name))
        .filter((x): x is ListOption => x !== null),
    })),
  }));
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
  const [query, setQuery] = React.useState('');
  const [openSpaces, setOpenSpaces] = React.useState<Set<string>>(new Set());
  const [openFolders, setOpenFolders] = React.useState<Set<string>>(new Set());

  const spaces = React.useMemo(() => buildTree(tree ?? []), [tree]);
  const q = query.trim().toLowerCase();
  const matches = (l: ListOption) =>
    q === '' || l.name.toLowerCase().includes(q);

  const toggle = (set: Set<string>, id: string): Set<string> => {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  };

  const ListRow = ({ list, indent }: { list: ListOption; indent: string }) => {
    const isOrigin = list.id === excludeListId;
    const selected = list.id === selectedListId;
    return (
      <button
        type='button'
        disabled={isOrigin}
        onClick={() => onSelect(list)}
        className={cn(
          'text-sm flex w-full items-center gap-2 rounded-md py-1.5 pr-2 transition-colors',
          indent,
          isOrigin
            ? 'cursor-not-allowed opacity-50'
            : 'cursor-pointer hover:bg-bg-weak-50',
          selected && 'bg-bg-weak-50',
        )}
      >
        <ListIcon className='size-3.5 shrink-0 text-text-soft-400' />
        <span className='truncate text-text-strong-950'>{list.name}</span>
        {isOrigin && (
          <Check className='ml-auto size-3.5 shrink-0 text-primary-base' />
        )}
      </button>
    );
  };

  return (
    <div className='flex flex-col'>
      <div className='relative mb-2'>
        <Search className='absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-text-soft-400' />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder='Buscar lista...'
          className='text-sm h-8 w-full rounded-md border border-stroke-soft-200 pl-8 pr-2 outline-none placeholder:text-text-soft-400 focus:border-stroke-sub-300'
        />
      </div>

      <div className='max-h-[320px] overflow-y-auto'>
        {isLoading && (
          <p className='py-6 text-center text-[12px] text-text-soft-400'>
            Carregando...
          </p>
        )}

        <p className='px-2 py-1.5 text-[11px] font-medium uppercase tracking-wider text-text-soft-400'>
          Espaços
        </p>

        {spaces.map((space) => {
          const visibleDirect = space.directLists.filter(matches);
          const visibleFolders = space.folders
            .map((f) => ({ ...f, lists: f.lists.filter(matches) }))
            .filter((f) => f.lists.length > 0 || q === '');
          const hasMatch =
            q === '' ||
            visibleDirect.length > 0 ||
            visibleFolders.some((f) => f.lists.length > 0);
          if (!hasMatch) return null;
          const spaceOpen = q !== '' || openSpaces.has(space.id);

          return (
            <div key={space.id}>
              <button
                type='button'
                onClick={() => setOpenSpaces((s) => toggle(s, space.id))}
                className='text-sm flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 font-medium text-text-strong-950 transition-colors hover:bg-bg-weak-50'
              >
                <ChevronRight
                  className={cn(
                    'size-3.5 shrink-0 text-text-soft-400 transition-transform',
                    spaceOpen && 'rotate-90',
                  )}
                />
                <span className='truncate'>{space.name}</span>
              </button>

              {spaceOpen && (
                <>
                  {visibleDirect.map((l) => (
                    <ListRow key={l.id} list={l} indent='pl-8' />
                  ))}
                  {visibleFolders.map((folder) => {
                    const folderOpen = q !== '' || openFolders.has(folder.id);
                    return (
                      <div key={folder.id}>
                        <button
                          type='button'
                          onClick={() =>
                            setOpenFolders((s) => toggle(s, folder.id))
                          }
                          className='text-sm flex w-full items-center gap-1.5 rounded-md py-1.5 pl-4 pr-2 text-text-strong-950 transition-colors hover:bg-bg-weak-50'
                        >
                          <ChevronRight
                            className={cn(
                              'size-3.5 shrink-0 text-text-soft-400 transition-transform',
                              folderOpen && 'rotate-90',
                            )}
                          />
                          <Folder className='size-3.5 shrink-0 text-text-soft-400' />
                          <span className='truncate'>{folder.name}</span>
                        </button>
                        {folderOpen &&
                          folder.lists.map((l) => (
                            <ListRow key={l.id} list={l} indent='pl-10' />
                          ))}
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
