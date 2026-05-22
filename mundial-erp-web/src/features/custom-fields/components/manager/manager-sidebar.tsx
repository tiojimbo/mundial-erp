'use client';

import { useMemo, useState } from 'react';
import {
  ChevronRight,
  Folder,
  FolderOpen,
  List,
  Lock,
  Search,
} from 'lucide-react';
import { useSidebarTree } from '@/features/navigation/hooks/use-sidebar-tree';
import { cn } from '@/lib/cn';
import type { ManagerView } from '../../hooks/use-custom-fields-manager-state';

interface ManagerSidebarProps {
  view: ManagerView;
  onChangeView: (view: ManagerView) => void;
}

const DEPT_COLORS: Record<string, string> = {
  CO: '#d97706',
  CM: '#0d9488',
  FI: '#ea580c',
  PR: '#22c55e',
  SI: '#7c3aed',
};

function getAbbr(name: string): string {
  return name.substring(0, 2).toUpperCase();
}

function DeptAvatar({ abbr, color }: { abbr: string; color: string | null }) {
  return (
    <span
      className='relative flex size-5 shrink-0 overflow-hidden rounded-[5px]'
      style={{ backgroundColor: color || DEPT_COLORS[abbr] || '#6b7280' }}
      aria-hidden='true'
    >
      <span className='flex size-full items-center justify-center rounded-[5px] !text-[10px] font-semibold uppercase leading-none text-white'>
        {abbr}
      </span>
    </span>
  );
}

function QuickItem({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type='button'
      onClick={onClick}
      className={cn(
        'flex h-8 w-full cursor-pointer items-center rounded-md px-2 text-left text-paragraph-sm transition-colors',
        active
          ? 'bg-accent font-medium text-foreground'
          : 'hover:bg-accent/60 text-foreground',
      )}
    >
      <span>{label}</span>
    </button>
  );
}

function LocationNode({
  label,
  kind,
  color,
  isPrivate,
  active,
  hasChildren,
  expanded,
  depth,
  onToggle,
  onSelect,
}: {
  label: string;
  kind: 'space' | 'folder' | 'list';
  color: string | null;
  isPrivate: boolean;
  active: boolean;
  hasChildren: boolean;
  expanded: boolean;
  depth: number;
  onToggle: () => void;
  onSelect: () => void;
}) {
  return (
    <div className='flex items-center' style={{ paddingLeft: depth * 12 }}>
      <button
        type='button'
        onClick={onToggle}
        aria-label={expanded ? 'Recolher' : 'Expandir'}
        className={cn(
          'flex h-6 w-5 shrink-0 cursor-pointer items-center justify-center rounded transition-colors hover:bg-accent',
          hasChildren ? '' : 'invisible',
        )}
      >
        <ChevronRight
          className={cn(
            'h-3 w-3 transition-transform',
            expanded ? 'rotate-90' : '',
          )}
        />
      </button>
      <button
        type='button'
        onClick={onSelect}
        className={cn(
          'flex h-7 flex-1 cursor-pointer items-center gap-2 rounded-md px-2 text-paragraph-sm transition-colors',
          active ? 'bg-accent font-medium' : 'hover:bg-accent/60',
        )}
      >
        {kind === 'space' ? (
          <DeptAvatar abbr={getAbbr(label)} color={color} />
        ) : kind === 'folder' ? (
          expanded ? (
            <FolderOpen className='size-4 shrink-0 text-muted-foreground' />
          ) : (
            <Folder className='size-4 shrink-0 text-muted-foreground' />
          )
        ) : (
          <List
            className='size-4 shrink-0 text-muted-foreground'
            strokeWidth={2}
          />
        )}
        {kind === 'list' && isPrivate ? (
          <Lock className='size-3 shrink-0 text-muted-foreground' />
        ) : null}
        <span className='truncate'>{label}</span>
      </button>
    </div>
  );
}

export function ManagerSidebar({ view, onChangeView }: ManagerSidebarProps) {
  const treeQuery = useSidebarTree();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [locSearch, setLocSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const spaces = useMemo(() => {
    const term = locSearch.trim().toLowerCase();
    const all = treeQuery.data ?? [];
    if (term.length === 0) return all;
    return all.filter((s) => s.name.toLowerCase().includes(term));
  }, [treeQuery.data, locSearch]);

  return (
    <aside className='flex h-full w-72 shrink-0 flex-col border-r bg-background'>
      <div className='border-b px-4 py-4'>
        <h2 className='text-label-sm leading-snug'>
          Gerenciador de campos personalizados
        </h2>
      </div>
      <div className='flex-1 overflow-y-auto'>
        <div className='space-y-0.5 px-3 py-3'>
          <QuickItem
            active={view.kind === 'all'}
            label='Todos os campos personalizados'
            onClick={() => onChangeView({ kind: 'all' })}
          />
          <QuickItem
            active={view.kind === 'workspace'}
            label='Espaço de trabalho'
            onClick={() => onChangeView({ kind: 'workspace' })}
          />
          <QuickItem
            active={view.kind === 'allGroups'}
            label='Todos os grupos'
            onClick={() => onChangeView({ kind: 'allGroups' })}
          />
          <QuickItem
            active={view.kind === 'taskTypeFields'}
            label='Campos por tipo de tarefa'
            onClick={() => onChangeView({ kind: 'taskTypeFields' })}
          />
        </div>

        <div className='px-3 py-2'>
          <div className='mb-2 flex items-center justify-between px-2'>
            <h3 className='text-subheading-xs text-[#838383]'>
              Por localização
            </h3>
            <button
              type='button'
              aria-label='Buscar local'
              onClick={() => setSearchOpen((v) => !v)}
              className='flex h-5 w-5 cursor-pointer items-center justify-center rounded text-muted-foreground transition-colors hover:text-foreground'
            >
              <Search className='h-3.5 w-3.5' />
            </button>
          </div>
          {searchOpen ? (
            <input
              type='search'
              autoFocus
              placeholder='Filtrar...'
              value={locSearch}
              onChange={(e) => setLocSearch(e.target.value)}
              className='focus-visible:ring-ring/50 mb-2 h-7 w-full rounded-md border border-input bg-transparent px-2 text-paragraph-xs outline-none focus-visible:ring-[3px]'
            />
          ) : null}
          <div className='space-y-0.5'>
            {treeQuery.isLoading ? (
              <p className='px-2 text-paragraph-xs text-muted-foreground'>
                Carregando...
              </p>
            ) : spaces.length > 0 ? (
              spaces.map((space) => {
                const spaceOpen = expanded.has(space.id);
                const hasChildren =
                  space.areas.length > 0 ||
                  (space.directProcesses?.length ?? 0) > 0;
                return (
                  <div key={space.id}>
                    <LocationNode
                      label={space.name}
                      kind='space'
                      color={space.color}
                      isPrivate={false}
                      depth={0}
                      active={
                        view.kind === 'space' && view.spaceId === space.id
                      }
                      hasChildren={hasChildren}
                      expanded={spaceOpen}
                      onToggle={() => toggle(space.id)}
                      onSelect={() =>
                        onChangeView({ kind: 'space', spaceId: space.id })
                      }
                    />
                    {spaceOpen ? (
                      <div className='space-y-0.5'>
                        {(space.directProcesses ?? []).map((proc) => (
                          <LocationNode
                            key={proc.id}
                            label={proc.name}
                            kind='list'
                            color={null}
                            isPrivate={proc.isPrivate}
                            depth={1}
                            active={
                              view.kind === 'list' && view.listId === proc.id
                            }
                            hasChildren={false}
                            expanded={false}
                            onToggle={() => undefined}
                            onSelect={() =>
                              onChangeView({ kind: 'list', listId: proc.id })
                            }
                          />
                        ))}
                        {space.areas.map((area) => {
                          const areaOpen = expanded.has(area.id);
                          return (
                            <div key={area.id}>
                              <LocationNode
                                label={area.name}
                                kind='folder'
                                color={null}
                                isPrivate={false}
                                depth={1}
                                active={
                                  view.kind === 'folder' &&
                                  view.folderId === area.id
                                }
                                hasChildren={area.processes.length > 0}
                                expanded={areaOpen}
                                onToggle={() => toggle(area.id)}
                                onSelect={() =>
                                  onChangeView({
                                    kind: 'folder',
                                    folderId: area.id,
                                  })
                                }
                              />
                              {areaOpen
                                ? area.processes.map((proc) => (
                                    <LocationNode
                                      key={proc.id}
                                      label={proc.name}
                                      kind='list'
                                      color={null}
                                      isPrivate={proc.isPrivate}
                                      depth={2}
                                      active={
                                        view.kind === 'list' &&
                                        view.listId === proc.id
                                      }
                                      hasChildren={false}
                                      expanded={false}
                                      onToggle={() => undefined}
                                      onSelect={() =>
                                        onChangeView({
                                          kind: 'list',
                                          listId: proc.id,
                                        })
                                      }
                                    />
                                  ))
                                : null}
                            </div>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                );
              })
            ) : (
              <p className='px-2 text-paragraph-xs text-muted-foreground'>
                Sem departamentos
              </p>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}
