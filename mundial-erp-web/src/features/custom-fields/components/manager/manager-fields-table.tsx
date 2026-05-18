'use client';

import { useMemo, useState } from 'react';
import {
  Calendar,
  CheckSquare,
  ChevronDown,
  ChevronRight,
  Clock,
  DollarSign,
  Ellipsis,
  FolderPlus,
  Gauge,
  Hash,
  Link2,
  List,
  ListPlus,
  Mail,
  Phone,
  Plus,
  Search,
  Star,
  Tag,
  Type,
  Users,
  X,
} from 'lucide-react';
import { useSidebarTree } from '@/features/navigation/hooks/use-sidebar-tree';
import { cn } from '@/lib/cn';
import { useCustomFieldsManager } from '../../hooks/use-custom-field-definitions';
import {
  viewToScope,
  type ManagerView,
} from '../../hooks/use-custom-fields-manager-state';
import { ManagerAddExistingFieldDialog } from './manager-add-existing-field-dialog';
import type {
  CustomFieldType,
  ManagerCustomFieldItem,
} from '../../types/custom-field.types';

const TYPE_LABEL: Record<CustomFieldType, string> = {
  TEXT: 'Texto',
  NUMBER: 'Número',
  CURRENCY: 'Moeda',
  DATE: 'Data',
  DROPDOWN: 'Lista suspensa',
  CPF: 'CPF',
  CNPJ: 'CNPJ',
  URL: 'URL',
  EMAIL: 'E-mail',
  PHONE: 'Telefone',
  SELECT: 'Seleção',
  CHECKBOX: 'Caixa de seleção',
  PERCENTAGE: 'Porcentagem',
  DURATION: 'Duração',
  RATING: 'Avaliação',
  USER: 'Usuário',
  TEAM: 'Equipe',
  PEOPLE: 'Pessoas',
  RELATIONSHIP: 'Relacionamento',
  ROLLUP: 'Rollup',
  LABEL: 'Etiqueta',
};

const LOC_TYPE_LABEL: Record<'list' | 'folder' | 'space', string> = {
  list: 'Lista',
  folder: 'Pasta',
  space: 'Departamento',
};

const TYPE_ICON: Record<
  CustomFieldType,
  { Icon: typeof Type; color: string }
> = {
  TEXT: { Icon: Type, color: 'text-blue-400' },
  NUMBER: { Icon: Hash, color: 'text-purple-400' },
  CURRENCY: { Icon: DollarSign, color: 'text-emerald-400' },
  DATE: { Icon: Calendar, color: 'text-orange-400' },
  DROPDOWN: { Icon: List, color: 'text-sky-400' },
  CPF: { Icon: Type, color: 'text-blue-400' },
  CNPJ: { Icon: Type, color: 'text-blue-400' },
  URL: { Icon: Link2, color: 'text-cyan-400' },
  EMAIL: { Icon: Mail, color: 'text-pink-400' },
  PHONE: { Icon: Phone, color: 'text-teal-400' },
  SELECT: { Icon: List, color: 'text-sky-400' },
  CHECKBOX: { Icon: CheckSquare, color: 'text-green-400' },
  PERCENTAGE: { Icon: Gauge, color: 'text-amber-400' },
  DURATION: { Icon: Clock, color: 'text-indigo-400' },
  RATING: { Icon: Star, color: 'text-yellow-400' },
  USER: { Icon: Users, color: 'text-rose-400' },
  TEAM: { Icon: Users, color: 'text-rose-400' },
  PEOPLE: { Icon: Users, color: 'text-rose-400' },
  RELATIONSHIP: { Icon: Link2, color: 'text-cyan-400' },
  ROLLUP: { Icon: Gauge, color: 'text-amber-400' },
  LABEL: { Icon: Tag, color: 'text-fuchsia-400' },
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('pt-BR', {
    day: 'numeric',
    month: 'numeric',
    year: '2-digit',
  });
}

interface ManagerFieldsTableProps {
  view: ManagerView;
  searchTerm: string;
  typeFilter: string | null;
  selectedDefId: string | null;
  onSelectDef: (id: string) => void;
  onChangeSearchTerm: (term: string) => void;
  onChangeTypeFilter: (type: string | null) => void;
  onOpenCreate: (type: CustomFieldType) => void;
  onOpenNewGroup: () => void;
  onClose?: () => void;
}

export function ManagerFieldsTable({
  view,
  searchTerm,
  typeFilter,
  selectedDefId,
  onSelectDef,
  onChangeSearchTerm,
  onChangeTypeFilter,
  onOpenCreate,
  onOpenNewGroup,
  onClose,
}: ManagerFieldsTableProps) {
  const { scope, targetId } = viewToScope(view);
  const managerQuery = useCustomFieldsManager(scope, targetId);
  const treeQuery = useSidebarTree();
  const [collapsed, setCollapsed] = useState<Set<CustomFieldType>>(new Set());
  const [addExistingOpen, setAddExistingOpen] = useState(false);
  const [typePickerOpen, setTypePickerOpen] = useState(false);
  const [typeQuery, setTypeQuery] = useState('');

  const locationNameMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const space of treeQuery.data ?? []) {
      map.set(space.id, space.name);
      for (const proc of space.directProcesses ?? []) {
        map.set(proc.id, proc.name);
      }
      for (const area of space.areas) {
        map.set(area.id, area.name);
        for (const proc of area.processes) map.set(proc.id, proc.name);
      }
    }
    return map;
  }, [treeQuery.data]);

  const title = useMemo(() => {
    switch (view.kind) {
      case 'all':
        return 'Todos os campos personalizados';
      case 'workspace':
        return 'Campos do workspace';
      case 'allGroups':
        return 'Todos os grupos';
      case 'taskTypeFields':
        return 'Campos por tipo de tarefa';
      case 'taskType':
        return 'Tipo de tarefa';
      case 'space':
        return locationNameMap.get(view.spaceId) ?? 'Departamento';
      case 'folder':
        return locationNameMap.get(view.folderId) ?? 'Pasta';
      case 'list':
        return locationNameMap.get(view.listId) ?? 'Lista';
    }
  }, [view, locationNameMap]);

  const filtered = useMemo<ManagerCustomFieldItem[]>(() => {
    const raw = managerQuery.data ?? [];
    const term = searchTerm.trim().toLowerCase();
    return raw.filter((item) => {
      if (typeFilter && item.type !== typeFilter) return false;
      if (term.length === 0) return true;
      const haystack = [item.name, item.label, item.description ?? '']
        .join(' ')
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [managerQuery.data, searchTerm, typeFilter]);

  const grouped = useMemo(() => {
    const map = new Map<CustomFieldType, ManagerCustomFieldItem[]>();
    for (const item of filtered) {
      const arr = map.get(item.type) ?? [];
      arr.push(item);
      map.set(item.type, arr);
    }
    return Array.from(map.entries()).sort(([a], [b]) =>
      TYPE_LABEL[a].localeCompare(TYPE_LABEL[b]),
    );
  }, [filtered]);

  const availableTypes = useMemo(() => {
    const set = new Set<CustomFieldType>();
    for (const item of managerQuery.data ?? []) set.add(item.type);
    return Array.from(set).sort((a, b) =>
      TYPE_LABEL[a].localeCompare(TYPE_LABEL[b]),
    );
  }, [managerQuery.data]);

  const toggleType = (type: CustomFieldType) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });


  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <div className="shrink-0 border-b px-6 py-4">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">{title}</h1>
            <p className="text-muted-foreground text-sm">
              Gerencie todos os campos personalizados do seu workspace
            </p>
          </div>
          <div className="flex items-center gap-2">
            {view.kind === 'allGroups' ? (
              <button
                type="button"
                onClick={onOpenNewGroup}
                className="inline-flex h-8 shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-md border bg-background px-3 text-sm font-medium shadow-xs transition-all hover:bg-accent hover:text-accent-foreground"
              >
                <FolderPlus className="mr-1.5 h-4 w-4" />
                Novo grupo
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => setAddExistingOpen(true)}
              className="inline-flex h-8 shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-md border bg-background px-3 text-sm font-medium shadow-xs transition-all hover:bg-accent hover:text-accent-foreground"
            >
              <ListPlus className="mr-1.5 h-4 w-4" />
              Adicionar campo existente
            </button>
            <div className="relative">
              <button
                type="button"
                onClick={() => setTypePickerOpen((v) => !v)}
                className="bg-primary text-primary-foreground inline-flex h-8 shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-md px-3 text-sm font-medium shadow-xs transition-all hover:bg-primary/90"
              >
                <Plus className="mr-1.5 h-4 w-4" />
                Criar novo
              </button>
              {typePickerOpen ? (
                <div className="bg-popover absolute right-0 z-50 mt-1 w-64 rounded-md border p-1 shadow-lg">
                  <div className="relative px-1 py-1">
                    <Search
                      aria-hidden="true"
                      className="text-muted-foreground pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2"
                    />
                    <input
                      type="search"
                      autoFocus
                      placeholder="Pesquisar..."
                      value={typeQuery}
                      onChange={(e) => setTypeQuery(e.target.value)}
                      className="border-input h-8 w-full rounded-md border bg-transparent pl-8 pr-2 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                    />
                  </div>
                  <div className="max-h-72 overflow-auto py-1">
                    {(Object.keys(TYPE_LABEL) as CustomFieldType[])
                      .filter((t) =>
                        TYPE_LABEL[t]
                          .toLowerCase()
                          .includes(typeQuery.trim().toLowerCase()),
                      )
                      .sort((a, b) =>
                        TYPE_LABEL[a].localeCompare(TYPE_LABEL[b]),
                      )
                      .map((t) => {
                        const { Icon, color } = TYPE_ICON[t];
                        return (
                          <button
                            key={t}
                            type="button"
                            onClick={() => {
                              setTypePickerOpen(false);
                              setTypeQuery('');
                              onOpenCreate(t);
                            }}
                            className="hover:bg-accent flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm"
                          >
                            <Icon className={cn('h-4 w-4', color)} />
                            {TYPE_LABEL[t]}
                          </button>
                        );
                      })}
                  </div>
                </div>
              ) : null}
            </div>
            <button
              type="button"
              aria-label="Fechar gerenciador"
              onClick={() => onClose?.()}
              className="inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-md transition-all hover:bg-accent hover:text-accent-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative max-w-xs flex-1">
            <Search
              aria-hidden="true"
              className="text-muted-foreground pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2"
            />
            <input
              type="search"
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => onChangeSearchTerm(e.target.value)}
              className="border-input h-8 w-full rounded-md border bg-transparent pl-8 pr-2 text-sm shadow-xs outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
            />
          </div>
          <div className="relative">
            <select
              aria-label="Filtrar por tipo"
              value={typeFilter ?? ''}
              onChange={(e) => onChangeTypeFilter(e.target.value || null)}
              className="border-input h-8 w-[160px] cursor-pointer appearance-none rounded-md border bg-transparent pl-3 pr-8 text-sm shadow-xs outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              <option value="">Todos os tipos</option>
              {availableTypes.map((type) => (
                <option key={type} value={type}>
                  {TYPE_LABEL[type]}
                </option>
              ))}
            </select>
            <ChevronDown
              aria-hidden="true"
              className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 opacity-50"
            />
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto px-6 py-4">
        {managerQuery.isLoading ? (
          <p className="p-4 text-sm text-muted-foreground">Carregando...</p>
        ) : managerQuery.isError ? (
          <p className="p-4 text-sm text-destructive">
            Erro ao carregar campos
          </p>
        ) : grouped.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">
            Nenhum campo neste escopo
          </p>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="text-muted-foreground border-b text-left text-xs">
                <th className="w-8 pr-2 pb-2" />
                <th className="pr-4 pb-2 font-medium">Nome</th>
                <th className="pr-4 pb-2 font-medium">Tipo</th>
                <th className="pr-4 pb-2 font-medium">Criado por</th>
                <th className="pr-4 pb-2 font-medium">Data de criação</th>
                <th className="pr-4 pb-2 font-medium">Localizações</th>
                <th className="w-10 pb-2" />
              </tr>
            </thead>
            <tbody>
              {grouped.map(([type, items]) => (
                <FieldsTypeGroup
                  key={type}
                  type={type}
                  items={items}
                  selectedDefId={selectedDefId}
                  onSelectDef={onSelectDef}
                  collapsed={collapsed.has(type)}
                  onToggleType={() => toggleType(type)}
                  locationNameMap={locationNameMap}
                  onCreate={() => onOpenCreate(type)}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>
      <ManagerAddExistingFieldDialog
        open={addExistingOpen}
        onClose={() => setAddExistingOpen(false)}
        view={view}
      />
    </div>
  );
}

interface FieldsTypeGroupProps {
  type: CustomFieldType;
  items: ManagerCustomFieldItem[];
  selectedDefId: string | null;
  onSelectDef: (id: string) => void;
  collapsed: boolean;
  onToggleType: () => void;
  locationNameMap: Map<string, string>;
  onCreate: () => void;
}

function FieldsTypeGroup({
  type,
  items,
  selectedDefId,
  onSelectDef,
  collapsed,
  onToggleType,
  locationNameMap,
  onCreate,
}: FieldsTypeGroupProps) {
  const { Icon, color } = TYPE_ICON[type];
  return (
    <>
      <tr
        onClick={onToggleType}
        className="hover:bg-muted/50 cursor-pointer border-b select-none"
      >
        <td colSpan={99} className="py-2">
          <div className="flex items-center gap-2">
            {collapsed ? (
              <ChevronRight className="text-muted-foreground h-4 w-4" />
            ) : (
              <ChevronDown className="text-muted-foreground h-4 w-4" />
            )}
            <Icon className={cn('h-4 w-4', color)} />
            <span className="text-sm font-medium">{TYPE_LABEL[type]}</span>
            <span className="bg-secondary text-secondary-foreground inline-flex items-center justify-center rounded-md px-2 py-0.5 text-xs font-medium">
              {items.length}
            </span>
          </div>
        </td>
      </tr>
      {collapsed ? null : (
        <>
          {items.map((item) => (
            <tr
              key={item.id}
              onClick={() => onSelectDef(item.id)}
              className={cn(
                'group cursor-pointer border-b transition-colors',
                selectedDefId === item.id
                  ? 'bg-primary/10'
                  : 'hover:bg-muted/30',
              )}
            >
              <td className="py-2 pr-2" onClick={(e) => e.stopPropagation()}>
                <input
                  type="checkbox"
                  aria-label={`Selecionar ${item.name}`}
                  className="size-3.5 shrink-0 cursor-pointer rounded-[4px] border"
                />
              </td>
              <td className="py-2 pr-4">
                <span className="text-sm font-medium">{item.name}</span>
              </td>
              <td className="py-2 pr-4">
                <span className="text-muted-foreground inline-flex items-center gap-1.5 text-xs">
                  <Icon className={cn('h-4 w-4', color)} />
                  {TYPE_LABEL[type]}
                </span>
              </td>
              <td className="py-2 pr-4">
                {item.creator ? (
                  <div className="flex items-center gap-1.5">
                    <div className="bg-muted flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-medium">
                      {item.creator.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-muted-foreground text-xs">
                      {item.creator.name}
                    </span>
                  </div>
                ) : (
                  <span className="text-muted-foreground text-xs">—</span>
                )}
              </td>
              <td className="py-2 pr-4">
                <span className="text-muted-foreground text-xs">
                  {formatDate(item.createdAt)}
                </span>
              </td>
              <td className="relative py-2 pr-4">
                {item.locations.length > 0 ? (
                  <div className="flex flex-wrap items-center gap-1">
                    {item.locations.map((loc) => (
                      <span
                        key={`${loc.type}-${loc.id}`}
                        className="text-foreground inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-normal"
                      >
                        <List className="h-3 w-3" />
                        <span className="max-w-[100px] truncate">
                          {locationNameMap.get(loc.id) ??
                            LOC_TYPE_LABEL[loc.type]}
                        </span>
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-muted-foreground text-xs">—</span>
                )}
              </td>
              <td className="py-2" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  aria-label={`Ações de ${item.name}`}
                  onClick={() => onSelectDef(item.id)}
                  className="inline-flex size-7 cursor-pointer items-center justify-center rounded-md opacity-0 transition-all hover:bg-accent hover:text-accent-foreground group-hover:opacity-100"
                >
                  <Ellipsis className="h-4 w-4" />
                </button>
              </td>
            </tr>
          ))}
          <tr className="border-b">
            <td colSpan={99} className="py-1.5">
              <button
                type="button"
                onClick={onCreate}
                className="text-muted-foreground hover:text-foreground inline-flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-1 text-xs transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                Criar campo de {TYPE_LABEL[type].toLowerCase()}
              </button>
            </td>
          </tr>
        </>
      )}
    </>
  );
}
