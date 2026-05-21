'use client';

import { useMemo, useState } from 'react';
import {
  Calendar,
  Check,
  CheckSquare,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Clock,
  DollarSign,
  Ellipsis,
  FolderPlus,
  Gauge,
  Hash,
  Layers,
  Link2,
  List,
  ListPlus,
  Mail,
  Pencil,
  Phone,
  Plus,
  Search,
  Star,
  Tag,
  Trash2,
  Type,
  Users,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { useSidebarTree } from '@/features/navigation/hooks/use-sidebar-tree';
import { cn } from '@/lib/cn';
import {
  useCustomFieldsManager,
  useDeleteCustomField,
} from '../../hooks/use-custom-field-definitions';
import {
  viewToScope,
  type ManagerView,
} from '../../hooks/use-custom-fields-manager-state';
import { ManagerAddExistingFieldDialog } from './manager-add-existing-field-dialog';
import { ManagerLocationCell } from './manager-location-cell';
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

const TYPE_ICON: Record<
  CustomFieldType,
  { Icon: typeof Type; color: string }
> = {
  TEXT: { Icon: Type, color: 'text-blue-500' },
  NUMBER: { Icon: Hash, color: 'text-purple-500' },
  CURRENCY: { Icon: DollarSign, color: 'text-emerald-500' },
  DATE: { Icon: Calendar, color: 'text-orange-500' },
  DROPDOWN: { Icon: List, color: 'text-sky-500' },
  CPF: { Icon: Type, color: 'text-blue-500' },
  CNPJ: { Icon: Type, color: 'text-blue-500' },
  URL: { Icon: Link2, color: 'text-cyan-500' },
  EMAIL: { Icon: Mail, color: 'text-pink-500' },
  PHONE: { Icon: Phone, color: 'text-teal-500' },
  SELECT: { Icon: List, color: 'text-sky-500' },
  CHECKBOX: { Icon: CheckSquare, color: 'text-green-500' },
  PERCENTAGE: { Icon: Gauge, color: 'text-amber-500' },
  DURATION: { Icon: Clock, color: 'text-indigo-500' },
  RATING: { Icon: Star, color: 'text-yellow-500' },
  USER: { Icon: Users, color: 'text-rose-500' },
  TEAM: { Icon: Users, color: 'text-rose-500' },
  PEOPLE: { Icon: Users, color: 'text-rose-500' },
  RELATIONSHIP: { Icon: Link2, color: 'text-cyan-500' },
  ROLLUP: { Icon: Gauge, color: 'text-amber-500' },
  LABEL: { Icon: Tag, color: 'text-fuchsia-500' },
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

const CREATE_ORDER: CustomFieldType[] = [
  'DROPDOWN',
  'TEXT',
  'DATE',
  'NUMBER',
  'LABEL',
  'CHECKBOX',
  'CURRENCY',
  'URL',
  'EMAIL',
  'PHONE',
  'RELATIONSHIP',
  'PEOPLE',
  'RATING',
  'SELECT',
  'PERCENTAGE',
  'DURATION',
  'USER',
  'TEAM',
  'ROLLUP',
  'CPF',
  'CNPJ',
];

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
  const [typeFilterOpen, setTypeFilterOpen] = useState(false);
  const [typeQuery, setTypeQuery] = useState('');
  const [nameSort, setNameSort] = useState<'asc' | 'desc'>('asc');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const deleteMutation = useDeleteCustomField();

  const toggleSelected = (id: string) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const clearSelected = () => setSelectedIds(new Set());
  const handleBulkDelete = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    if (!confirm(`Excluir ${ids.length} campo(s)?`)) return;
    try {
      await Promise.all(ids.map((id) => deleteMutation.mutateAsync(id)));
      toast.success(`${ids.length} campo(s) excluído(s).`);
      clearSelected();
    } catch {
      toast.error('Erro ao excluir um ou mais campos.');
    }
  };

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
    <div className="relative flex min-w-0 flex-1 flex-col">
      <div className="shrink-0 border-b px-6 py-4">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-label-sm">{title}</h1>
          <button
            type="button"
            aria-label="Fechar gerenciador"
            onClick={() => onClose?.()}
            className="inline-flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md transition-all hover:bg-accent hover:text-accent-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative w-56">
            <Search
              aria-hidden="true"
              className="text-muted-foreground pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2"
            />
            <input
              type="search"
              placeholder="Pesquisar..."
              value={searchTerm}
              onChange={(e) => onChangeSearchTerm(e.target.value)}
              className="h-6 w-full rounded-md border border-[#e8e8e8] bg-transparent pl-7 pr-2 text-paragraph-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
            />
          </div>
          <div className="relative">
            <button
              type="button"
              onClick={() => setTypeFilterOpen((v) => !v)}
              className="inline-flex h-6 cursor-pointer items-center gap-1 rounded-full border border-[#e0e1e6] bg-[#f0f0f0] px-2 text-subheading-xs text-foreground transition-colors hover:bg-[#e6e6e6]"
            >
              <Layers className="h-3.5 w-3.5" />
              {typeFilter
                ? TYPE_LABEL[typeFilter as CustomFieldType]
                : 'Field type'}
              <ChevronDown className="h-3.5 w-3.5 opacity-60" />
            </button>
            {typeFilterOpen ? (
              <>
                <button
                  type="button"
                  aria-hidden="true"
                  tabIndex={-1}
                  className="fixed inset-0 z-40 cursor-default"
                  onClick={() => setTypeFilterOpen(false)}
                />
                <div className="bg-popover absolute left-0 z-50 mt-1 w-56 rounded-md border p-1 shadow-regular-md">
                <button
                  type="button"
                  onClick={() => {
                    onChangeTypeFilter(null);
                    setTypeFilterOpen(false);
                  }}
                  className="hover:bg-accent flex w-full cursor-pointer items-center rounded-md px-2 py-1.5 text-left text-paragraph-sm"
                >
                  Todos os tipos
                </button>
                {availableTypes.map((t) => {
                  const { Icon, color } = TYPE_ICON[t];
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => {
                        onChangeTypeFilter(t);
                        setTypeFilterOpen(false);
                      }}
                      className="hover:bg-accent flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left text-paragraph-sm"
                    >
                      <Icon className={cn('h-4 w-4', color)} />
                      {TYPE_LABEL[t]}
                    </button>
                  );
                })}
              </div>
              </>
            ) : null}
          </div>
          <div className="relative ml-auto">
            <button
              type="button"
              onClick={() => setTypePickerOpen((v) => !v)}
              className="bg-[#202020] text-white inline-flex h-6 shrink-0 cursor-pointer items-center justify-center rounded-md px-2 text-subheading-xs shadow-regular-xs transition-all hover:bg-[#363636]"
            >
              Criar novo
            </button>
            {typePickerOpen ? (
              <>
                <button
                  type="button"
                  aria-hidden="true"
                  tabIndex={-1}
                  className="fixed inset-0 z-40 cursor-default"
                  onClick={() => setTypePickerOpen(false)}
                />
                <div className="bg-popover absolute right-0 z-50 mt-1 w-[280px] rounded-md border p-1 shadow-regular-md">
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
                    className="border-input h-8 w-full rounded-md border bg-transparent pl-8 pr-2 text-paragraph-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setTypePickerOpen(false);
                    setTypeQuery('');
                    setAddExistingOpen(true);
                  }}
                  className="hover:bg-accent flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left text-paragraph-sm"
                >
                  <ListPlus className="h-4 w-4" />
                  Adicionar campo existente
                </button>
                {view.kind === 'allGroups' ? (
                  <button
                    type="button"
                    onClick={() => {
                      setTypePickerOpen(false);
                      onOpenNewGroup();
                    }}
                    className="hover:bg-accent flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left text-paragraph-sm"
                  >
                    <FolderPlus className="h-4 w-4" />
                    Novo grupo
                  </button>
                ) : null}
                <div className="bg-border my-1 h-px" />
                <div className="max-h-72 overflow-auto py-1">
                  <div className="text-[#838383] px-2 pt-1.5 pb-1 text-subheading-xs">
                    Todos
                  </div>
                  {(Object.keys(TYPE_LABEL) as CustomFieldType[])
                    .filter((t) =>
                      TYPE_LABEL[t]
                        .toLowerCase()
                        .includes(typeQuery.trim().toLowerCase()),
                    )
                    .sort(
                      (a, b) =>
                        CREATE_ORDER.indexOf(a) - CREATE_ORDER.indexOf(b),
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
                          className="hover:bg-accent flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left text-paragraph-sm"
                        >
                          <Icon className={cn('h-4 w-4', color)} />
                          {TYPE_LABEL[t]}
                        </button>
                      );
                    })}
                </div>
              </div>
              </>
            ) : null}
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto px-6 py-4">
        {managerQuery.isLoading ? (
          <p className="p-4 text-paragraph-sm text-muted-foreground">Carregando...</p>
        ) : managerQuery.isError ? (
          <p className="p-4 text-paragraph-sm text-destructive">
            Erro ao carregar campos
          </p>
        ) : grouped.length === 0 ? (
          <p className="p-4 text-paragraph-sm text-muted-foreground">
            Nenhum campo neste escopo
          </p>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b text-left text-paragraph-xs text-[#838383]">
                <th className="w-6 pb-2" />
                <th className="pr-4 pb-2 font-normal">
                  <button
                    type="button"
                    onClick={() =>
                      setNameSort((s) => (s === 'asc' ? 'desc' : 'asc'))
                    }
                    className="inline-flex cursor-pointer items-center gap-1"
                  >
                    Nome
                    {nameSort === 'asc' ? (
                      <ChevronUp className="h-3 w-3" />
                    ) : (
                      <ChevronDown className="h-3 w-3" />
                    )}
                  </button>
                </th>
                <th className="pr-4 pb-2 font-normal">Tipo</th>
                <th className="pr-4 pb-2 font-normal">Criado por</th>
                <th className="pr-4 pb-2 font-normal">Data de criação</th>
                <th className="pr-4 pb-2 font-normal">Localizações</th>
                <th className="w-10 pb-2 text-right">
                  <Plus
                    className="ml-auto h-4 w-4"
                    aria-label="Adicionar campo"
                  />
                </th>
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
                  onCreate={() => onOpenCreate(type)}
                  nameSort={nameSort}
                  selectedIds={selectedIds}
                  onToggleSelected={toggleSelected}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>
      {selectedIds.size > 0 ? (
        <div className="absolute inset-x-12 bottom-6 z-30 flex h-12 items-center justify-between rounded-lg bg-[#202020] px-3 text-white shadow-regular-md">
          <button
            type="button"
            onClick={clearSelected}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-1 text-paragraph-sm font-medium transition-colors hover:bg-white/10"
          >
            {selectedIds.size}{' '}
            {selectedIds.size === 1
              ? 'Campo personalizado selecionado'
              : 'Campos personalizados selecionados'}
            <X className="h-3.5 w-3.5" />
          </button>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled
              title="Em breve"
              className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-md px-2 py-1 text-paragraph-sm opacity-50"
            >
              <Layers className="h-3.5 w-3.5" />
              Mesclar
            </button>
            <button
              type="button"
              onClick={handleBulkDelete}
              disabled={deleteMutation.isPending}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-1 text-paragraph-sm transition-colors hover:bg-white/10 disabled:pointer-events-none disabled:opacity-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Excluir
            </button>
          </div>
        </div>
      ) : null}
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
  onCreate: () => void;
  nameSort: 'asc' | 'desc';
  selectedIds: Set<string>;
  onToggleSelected: (id: string) => void;
}

function FieldsTypeGroup({
  type,
  items,
  selectedDefId,
  onSelectDef,
  collapsed,
  onToggleType,
  onCreate,
  nameSort,
  selectedIds,
  onToggleSelected,
}: FieldsTypeGroupProps) {
  const { Icon, color } = TYPE_ICON[type];
  return (
    <>
      <tr
        onClick={onToggleType}
        className="hover:bg-muted/40 cursor-pointer select-none"
      >
        <td colSpan={99} className="py-2.5">
          <div className="flex items-center gap-2">
            {collapsed ? (
              <ChevronRight className="text-muted-foreground h-4 w-4" />
            ) : (
              <ChevronDown className="text-muted-foreground h-4 w-4" />
            )}
            <span
              className={cn(
                'inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-paragraph-xs font-medium',
                color,
              )}
              style={{
                backgroundColor:
                  'color-mix(in srgb, currentColor 16%, transparent)',
              }}
            >
              <Icon className="h-3.5 w-3.5" />
              {TYPE_LABEL[type]}
            </span>
            <span className="text-muted-foreground text-paragraph-xs">
              {items.length}
            </span>
          </div>
        </td>
      </tr>
      {collapsed ? null : (
        <>
          {[...items]
            .sort((a, b) =>
              nameSort === 'asc'
                ? a.name.localeCompare(b.name)
                : b.name.localeCompare(a.name),
            )
            .map((item) => (
            <tr
              key={item.id}
              onClick={() => onSelectDef(item.id)}
              className={cn(
                'group cursor-pointer transition-colors',
                selectedDefId === item.id || selectedIds.has(item.id)
                  ? 'bg-[#F0F0F0]'
                  : 'hover:bg-muted/30',
              )}
            >
              <td
                className="w-6 py-1.5"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  aria-pressed={selectedIds.has(item.id)}
                  aria-label={
                    (selectedIds.has(item.id)
                      ? 'Desmarcar '
                      : 'Selecionar ') + item.name
                  }
                  onClick={() => onToggleSelected(item.id)}
                  className={cn(
                    'ml-1 inline-flex size-4 cursor-pointer items-center justify-center rounded-[4px] border transition-all',
                    selectedIds.has(item.id)
                      ? 'border-transparent bg-[#202020] text-white opacity-100'
                      : 'border-[#c4c4c4] text-transparent opacity-0 group-hover:opacity-100',
                  )}
                >
                  <Check className="h-2.5 w-2.5" />
                </button>
              </td>
              <td className="py-1.5 pr-4">
                <div className="flex items-center gap-2">
                  <span className="text-paragraph-sm">{item.name}</span>
                  <button
                    type="button"
                    aria-label={`Editar ${item.name}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectDef(item.id);
                    }}
                    className="text-muted-foreground hover:bg-accent hidden cursor-pointer items-center gap-1 rounded px-1.5 py-0.5 text-paragraph-xs group-hover:inline-flex"
                  >
                    <Pencil className="h-3 w-3" />
                    Editar
                  </button>
                </div>
              </td>
              <td className="py-1.5 pr-4">
                <Icon
                  className={cn('h-4 w-4', color)}
                  aria-label={TYPE_LABEL[type]}
                />
              </td>
              <td className="py-1.5 pr-4">
                {item.creator ? (
                  <div className="flex items-center gap-1.5">
                    <div className="bg-muted flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-medium">
                      {item.creator.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-muted-foreground text-paragraph-xs">
                      {item.creator.name}
                    </span>
                  </div>
                ) : (
                  <span className="text-muted-foreground text-paragraph-xs">—</span>
                )}
              </td>
              <td className="py-1.5 pr-4">
                <span className="text-muted-foreground text-paragraph-xs">
                  {formatDate(item.createdAt)}
                </span>
              </td>
              <td className="relative py-1.5 pr-4" onClick={(e) => e.stopPropagation()}>
                <ManagerLocationCell def={item} />
              </td>
              <td className="py-1.5" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  aria-label={`Ações de ${item.name}`}
                  onClick={() => onSelectDef(item.id)}
                  className="inline-flex size-6 cursor-pointer items-center justify-center rounded-md opacity-0 transition-all hover:bg-accent hover:text-accent-foreground group-hover:opacity-100"
                >
                  <Ellipsis className="h-4 w-4" />
                </button>
              </td>
            </tr>
          ))}
          <tr>
            <td colSpan={99} className="py-1.5">
              <button
                type="button"
                onClick={onCreate}
                className="text-muted-foreground hover:text-foreground inline-flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-1 text-paragraph-xs transition-colors"
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
