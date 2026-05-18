'use client';

import { useState } from 'react';
import {
  ChevronRight,
  Database,
  Globe,
  Layers,
  LayoutGrid,
} from 'lucide-react';
import { useSidebarTree } from '@/features/navigation/hooks/use-sidebar-tree';
import { cn } from '@/lib/cn';
import type { ManagerView } from '../../hooks/use-custom-fields-manager-state';

interface ManagerSidebarProps {
  view: ManagerView;
  onChangeView: (view: ManagerView) => void;
}

interface QuickItemProps {
  active: boolean;
  label: string;
  icon: React.ReactNode;
  badge?: string;
  onClick: () => void;
}

function QuickItem({ active, label, icon, badge, onClick }: QuickItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex h-8 w-full cursor-pointer items-center justify-start gap-2 rounded-md px-2 text-sm font-medium transition-all hover:bg-accent hover:text-accent-foreground',
        active ? 'bg-primary/10 text-primary' : 'text-muted-foreground',
      )}
    >
      {icon}
      <span className="truncate">{label}</span>
      {badge ? (
        <span className="bg-primary/10 text-primary ml-auto rounded px-1.5 py-0.5 text-[10px] font-medium">
          {badge}
        </span>
      ) : null}
    </button>
  );
}

interface LocationNodeProps {
  label: string;
  active: boolean;
  hasChildren: boolean;
  expanded: boolean;
  depth: number;
  onToggle: () => void;
  onSelect: () => void;
}

function LocationNode({
  label,
  active,
  hasChildren,
  expanded,
  depth,
  onToggle,
  onSelect,
}: LocationNodeProps) {
  return (
    <div className="flex items-center" style={{ paddingLeft: depth * 12 }}>
      <button
        type="button"
        onClick={onToggle}
        aria-label={expanded ? 'Recolher' : 'Expandir'}
        className={cn(
          'flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-md transition-all hover:bg-accent hover:text-accent-foreground',
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
        type="button"
        onClick={onSelect}
        className={cn(
          'flex h-7 flex-1 cursor-pointer items-center justify-start gap-2 rounded-md px-2 text-sm transition-all hover:bg-accent hover:text-accent-foreground',
          active ? 'bg-primary/10 font-medium text-primary' : '',
        )}
      >
        <Globe className="text-muted-foreground h-3.5 w-3.5" />
        <span className="truncate">{label}</span>
      </button>
    </div>
  );
}

export function ManagerSidebar({ view, onChangeView }: ManagerSidebarProps) {
  const treeQuery = useSidebarTree();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <aside className="bg-background flex h-full w-64 shrink-0 flex-col border-r">
      <div className="flex-1 overflow-y-auto">
        <div className="px-3 py-3">
          <h3 className="text-muted-foreground mb-2 text-xs font-semibold uppercase tracking-wider">
            Acesso rápido
          </h3>
          <div className="space-y-0.5">
            <QuickItem
              active={view.kind === 'all'}
              label="Todos os campos personalizados"
              icon={<Database className="h-4 w-4" />}
              onClick={() => onChangeView({ kind: 'all' })}
            />
            <QuickItem
              active={view.kind === 'workspace'}
              label="Campos do workspace"
              icon={<Globe className="h-4 w-4" />}
              onClick={() => onChangeView({ kind: 'workspace' })}
            />
            <QuickItem
              active={view.kind === 'allGroups'}
              label="Todos os grupos"
              icon={<Layers className="h-4 w-4" />}
              onClick={() => onChangeView({ kind: 'allGroups' })}
            />
            <QuickItem
              active={view.kind === 'taskTypeFields'}
              label="Campos por tipo de tarefa"
              icon={<LayoutGrid className="h-4 w-4" />}
              badge="Novo"
              onClick={() => onChangeView({ kind: 'taskTypeFields' })}
            />
          </div>
        </div>

        <div className="bg-border mx-3 h-px shrink-0" />

        <div className="px-3 py-3">
          <h3 className="text-muted-foreground mb-2 text-xs font-semibold uppercase tracking-wider">
            Por local
          </h3>
          <div className="space-y-0.5">
            {treeQuery.isLoading ? (
              <p className="px-2 text-xs text-muted-foreground">
                Carregando...
              </p>
            ) : treeQuery.data && treeQuery.data.length > 0 ? (
              treeQuery.data.map((space) => {
                const spaceOpen = expanded.has(space.id);
                const hasChildren =
                  space.areas.length > 0 ||
                  (space.directProcesses?.length ?? 0) > 0;
                return (
                  <div key={space.id}>
                    <LocationNode
                      label={space.name}
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
                      <div className="space-y-0.5">
                        {(space.directProcesses ?? []).map((proc) => (
                          <LocationNode
                            key={proc.id}
                            label={proc.name}
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
              <p className="px-2 text-xs text-muted-foreground">
                Sem departamentos
              </p>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}
