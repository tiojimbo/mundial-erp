'use client';

import { useEffect, useState } from 'react';
import {
  ArrowRightLeft,
  Building2,
  ChevronDown,
  ChevronRight,
  Folder,
  GripVertical,
  Info,
  List,
  Lock,
  Plus,
  Smile,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/cn';
import {
  useAddCustomFieldLocation,
  useDeleteCustomField,
  useRemoveCustomFieldLocation,
  useUpdateCustomField,
} from '../../hooks/use-custom-field-definitions';
import { useCustomFieldGroupsList } from '../../hooks/use-custom-field-groups';
import { useSidebarTree } from '@/features/navigation/hooks/use-sidebar-tree';
import {
  QUANTITY_UNIT_ABBR,
  QUANTITY_UNIT_LABEL,
} from '../../types/custom-field.types';
import type {
  CustomFieldConfig,
  CustomFieldDefinition,
  CustomFieldLocationType,
  CustomFieldType,
  ManagerCustomFieldItem,
  QuantityUnit,
} from '../../types/custom-field.types';

interface ManagerFieldDetailSidebarProps {
  def: ManagerCustomFieldItem | null;
  onDeleted: () => void;
  onClose?: () => void;
}

const TYPES_WITH_OPTIONS = new Set(['SELECT', 'LABEL', 'DROPDOWN']);

const CURRENCY_CODES = ['BRL', 'USD', 'EUR', 'GBP', 'ARS'] as const;

function defaultConfig(type: CustomFieldType): CustomFieldConfig {
  switch (type) {
    case 'CURRENCY':
      return { currency: 'BRL' };
    case 'DATE':
      return { includeTime: false };
    case 'RATING':
      return { maxStars: 5 };
    case 'PERCENTAGE':
      return { min: 0, max: 100 };
    case 'PEOPLE':
      return { multiple: true };
    case 'QUANTITY':
      return { unit: 'METER2' };
    default:
      return {};
  }
}

const TYPE_DISPLAY: Record<CustomFieldType, string> = {
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
  QUANTITY: 'Quantidade',
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

const OPTION_PALETTE = [
  '#7C4DFF',
  '#F06292',
  '#42A5F5',
  '#66BB6A',
  '#FFA726',
  '#26C6DA',
  '#EC407A',
  '#AB47BC',
  '#FFCA28',
  '#8D6E63',
];

type OptionDraft = { value: string; color: string };

function paletteColor(i: number): string {
  return OPTION_PALETTE[i % OPTION_PALETTE.length];
}

function defaultOptions(def: CustomFieldDefinition | null): OptionDraft[] {
  if (!def) return [];
  if (Array.isArray(def.options) && def.options.length > 0) {
    return def.options
      .map((opt, i): OptionDraft | null => {
        if (typeof opt === 'string')
          return { value: opt, color: paletteColor(i) };
        if (typeof opt === 'object' && opt !== null) {
          const value = (opt as { value?: unknown }).value;
          const color = (opt as { color?: unknown }).color;
          if (typeof value !== 'string') return null;
          return {
            value,
            color: typeof color === 'string' && color ? color : paletteColor(i),
          };
        }
        return null;
      })
      .filter((v): v is OptionDraft => v !== null);
  }
  return (def.config?.options ?? []).map((opt, i) => {
    const c = (opt as { color?: unknown }).color;
    return {
      value: opt.value,
      color: typeof c === 'string' && c ? c : paletteColor(i),
    };
  });
}

function Switch({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      data-state={checked ? 'checked' : 'unchecked'}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50',
        checked ? 'bg-primary-base' : 'bg-input',
      )}
    >
      <span
        className={cn(
          'pointer-events-none block h-4 w-4 rounded-full bg-background shadow ring-0 transition-transform',
          checked ? 'translate-x-4' : 'translate-x-0',
        )}
      />
    </button>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="text-foreground/80 mb-1.5 block text-paragraph-sm font-medium">
      {children}
    </label>
  );
}

export function ManagerFieldDetailSidebar({
  def,
  onDeleted,
  onClose,
}: ManagerFieldDetailSidebarProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [defaultValue, setDefaultValue] = useState('');
  const [required, setRequired] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [visibleToGuests, setVisibleToGuests] = useState(true);
  const [groupId, setGroupId] = useState<string>('');
  const [fillMethod, setFillMethod] = useState<'MANUAL' | 'AI'>('MANUAL');
  const [options, setOptions] = useState<OptionDraft[]>([]);
  const [openColorIdx, setOpenColorIdx] = useState<number | null>(null);
  const [defaultIndex, setDefaultIndex] = useState<number | null>(null);
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null);
  const [changeLocOpenKey, setChangeLocOpenKey] = useState<string | null>(null);
  const [addLocOpen, setAddLocOpen] = useState(false);
  const [config, setConfig] = useState<CustomFieldConfig>({});
  const [moreOpen, setMoreOpen] = useState(false);
  const [sortMode, setSortMode] = useState<'manual' | 'alpha' | 'alpha_desc'>(
    'manual',
  );
  const [sortOpen, setSortOpen] = useState(false);

  const updateMutation = useUpdateCustomField();
  const deleteMutation = useDeleteCustomField();
  const addLocation = useAddCustomFieldLocation();
  const removeLocation = useRemoveCustomFieldLocation();
  const treeQuery = useSidebarTree();
  const groupsQuery = useCustomFieldGroupsList();

  useEffect(() => {
    if (!def) return;
    setName(def.name);
    setDescription(def.description ?? '');
    setDefaultValue(
      typeof def.defaultValue === 'string' ? def.defaultValue : '',
    );
    setRequired(def.required);
    setPinned(def.pinned);
    setVisibleToGuests(def.visibleToGuests);
    setGroupId(def.groupId ?? '');
    setFillMethod(
      (def.fillMethod ?? '').toUpperCase().includes('AI') ? 'AI' : 'MANUAL',
    );
    const opts = defaultOptions(def);
    setOptions(opts);
    setConfig({ ...defaultConfig(def.type), ...(def.config ?? {}) });
    const dv =
      typeof def.defaultValue === 'string' ? def.defaultValue : '';
    const idx = opts.findIndex((o) => o.value === dv);
    setDefaultIndex(idx >= 0 ? idx : null);
    setDraggingIdx(null);
    setOpenColorIdx(null);
    setMoreOpen(false);
  }, [def]);

  if (!def) {
    return null;
  }

  const isBuiltin = def.fixed;
  const showOptions = TYPES_WITH_OPTIONS.has(def.type);

  const handleSave = () => {
    if (isBuiltin) return;
    const parsedOptions = showOptions
      ? options
          .filter((o) => o.value.trim().length > 0)
          .map((o) => ({
            value: o.value.trim(),
            label: o.value.trim(),
            color: o.color,
          }))
      : undefined;
    const resolvedDefaultValue = showOptions
      ? defaultIndex != null
        ? options[defaultIndex]?.value.trim() || undefined
        : undefined
      : defaultValue.trim() || undefined;
    updateMutation.mutate(
      {
        id: def.id,
        payload: {
          name,
          label: name,
          description: description || undefined,
          defaultValue: resolvedDefaultValue,
          required,
          pinned,
          visibleToGuests,
          fillMethod,
          groupId: groupId || undefined,
          options: parsedOptions,
          config: Object.keys(config).length > 0 ? config : undefined,
        },
      },
      {
        onError: () => toast.error('Erro ao salvar — verifique o backend.'),
        onSuccess: () => toast.success('Campo salvo.'),
      },
    );
  };

  const handleDelete = () => {
    if (isBuiltin) return;
    if (!confirm(`Deletar campo "${def.name}"?`)) return;
    deleteMutation.mutate(def.id, {
      onSuccess: () => onDeleted(),
    });
  };

  const locationOptions: { value: string; label: string }[] = [];
  for (const space of treeQuery.data ?? []) {
    locationOptions.push({
      value: `space:${space.id}`,
      label: `Departamento · ${space.name}`,
    });
    for (const proc of space.directProcesses ?? []) {
      locationOptions.push({
        value: `list:${proc.id}`,
        label: `Lista · ${proc.name}`,
      });
    }
    for (const area of space.areas) {
      locationOptions.push({
        value: `folder:${area.id}`,
        label: `Pasta · ${area.name}`,
      });
      for (const proc of area.processes) {
        locationOptions.push({
          value: `list:${proc.id}`,
          label: `Lista · ${proc.name}`,
        });
      }
    }
  }

  const handleAddLocation = (raw: string) => {
    if (isBuiltin || !raw) return;
    const [locationType, targetId] = raw.split(':') as [
      CustomFieldLocationType,
      string,
    ];
    addLocation.mutate(
      { customFieldId: def.id, targetId, locationType, action: 'ADD' },
      {
        onError: () => toast.error('Erro ao vincular campo ao local.'),
        onSuccess: () => {
          toast.success('Campo vinculado ao local.');
        },
      },
    );
  };

  const handleRemoveLocation = (
    locationType: CustomFieldLocationType,
    locationId: string,
  ) => {
    if (isBuiltin) return;
    removeLocation.mutate(
      { customFieldId: def.id, locationType, locationId },
      {
        onError: () => toast.error('Erro ao desvincular campo do local.'),
      },
    );
  };

  return (
    <aside
      aria-label="Detalhe do campo"
      className="border-border bg-background flex min-h-0 w-[min(100%,340px)] min-w-[300px] shrink-0 flex-col border-l"
    >
      <header className="border-border flex shrink-0 items-center justify-between border-b px-4 py-3">
        <button
          type="button"
          onClick={() =>
            toast.info('O tipo do campo não pode ser alterado.')
          }
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-1 text-paragraph-sm font-medium transition-colors hover:bg-accent"
        >
          {TYPE_DISPLAY[def.type]}
          <ChevronDown className="h-3.5 w-3.5 opacity-60" />
        </button>
        <button
          type="button"
          aria-label="Fechar painel"
          onClick={() => onClose?.()}
          className="inline-flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md transition-all hover:bg-accent hover:text-accent-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
        <div className="space-y-4">
          <div>
            <FieldLabel>
              Nome do campo <span className="text-destructive">*</span>
            </FieldLabel>
            <div className="relative">
              <input
                type="text"
                value={name}
                disabled={isBuiltin}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nome do campo"
                className="border-input h-9 w-full rounded-md border bg-transparent pl-3 pr-9 text-paragraph-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-50"
              />
              <button
                type="button"
                disabled
                title="Em breve"
                aria-label="Adicionar emoji"
                className="text-muted-foreground absolute right-1.5 top-1/2 inline-flex size-7 -translate-y-1/2 cursor-not-allowed items-center justify-center rounded opacity-50"
              >
                <Smile className="h-4 w-4" />
              </button>
            </div>
          </div>

          {def.type === 'CURRENCY' ? (
            <div>
              <FieldLabel>Moeda</FieldLabel>
              <select
                value={config.currency ?? 'BRL'}
                disabled={isBuiltin}
                onChange={(e) =>
                  setConfig((c) => ({ ...c, currency: e.target.value }))
                }
                className="border-input h-9 w-full cursor-pointer rounded-md border bg-transparent px-3 text-paragraph-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-50"
              >
                {CURRENCY_CODES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          {def.type === 'QUANTITY' ? (
            <div>
              <FieldLabel>Unidade de medida</FieldLabel>
              <select
                value={config.unit ?? 'METER2'}
                disabled={isBuiltin}
                onChange={(e) =>
                  setConfig((c) => ({
                    ...c,
                    unit: e.target.value as QuantityUnit,
                  }))
                }
                className="border-input h-9 w-full cursor-pointer rounded-md border bg-transparent px-3 text-paragraph-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-50"
              >
                {(Object.keys(QUANTITY_UNIT_LABEL) as QuantityUnit[]).map(
                  (u) => (
                    <option key={u} value={u}>
                      {QUANTITY_UNIT_LABEL[u]} ({QUANTITY_UNIT_ABBR[u]})
                    </option>
                  ),
                )}
              </select>
            </div>
          ) : null}

          {def.type === 'DATE' ? (
            <div className="flex items-center justify-between">
              <span className="text-foreground/80 text-paragraph-sm font-medium">
                Incluir hora
              </span>
              <Switch
                checked={config.includeTime === true}
                disabled={isBuiltin}
                onChange={(v) =>
                  setConfig((c) => ({ ...c, includeTime: v }))
                }
              />
            </div>
          ) : null}

          {def.type === 'RATING' ? (
            <div>
              <FieldLabel>Estrelas máximas</FieldLabel>
              <input
                type="number"
                min={1}
                max={10}
                disabled={isBuiltin}
                value={config.maxStars ?? 5}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  if (!Number.isFinite(n)) return;
                  setConfig((c) => ({
                    ...c,
                    maxStars: Math.min(10, Math.max(1, Math.round(n))),
                  }));
                }}
                className="border-input h-9 w-full rounded-md border bg-transparent px-3 text-paragraph-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-50"
              />
            </div>
          ) : null}

          {def.type === 'NUMBER' || def.type === 'PERCENTAGE' ? (
            <div>
              <FieldLabel>Limites</FieldLabel>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  placeholder="Mín"
                  disabled={isBuiltin}
                  value={config.min ?? ''}
                  onChange={(e) =>
                    setConfig((c) => ({
                      ...c,
                      min:
                        e.target.value === ''
                          ? undefined
                          : Number(e.target.value),
                    }))
                  }
                  className="border-input h-9 w-1/2 rounded-md border bg-transparent px-3 text-paragraph-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-50"
                />
                <input
                  type="number"
                  placeholder="Máx"
                  disabled={isBuiltin}
                  value={config.max ?? ''}
                  onChange={(e) =>
                    setConfig((c) => ({
                      ...c,
                      max:
                        e.target.value === ''
                          ? undefined
                          : Number(e.target.value),
                    }))
                  }
                  className="border-input h-9 w-1/2 rounded-md border bg-transparent px-3 text-paragraph-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-50"
                />
              </div>
            </div>
          ) : null}

          {def.type === 'PEOPLE' ? (
            <div className="flex items-center justify-between">
              <span className="text-foreground/80 text-paragraph-sm font-medium">
                Permitir múltiplos
              </span>
              <Switch
                checked={config.multiple !== false}
                disabled={isBuiltin}
                onChange={(v) =>
                  setConfig((c) => ({ ...c, multiple: v }))
                }
              />
            </div>
          ) : null}

          {def.type === 'CNPJ' ? (
            <div className="flex items-center justify-between">
              <span className="text-foreground/80 text-paragraph-sm font-medium">
                Autopreencher pela Receita Federal
              </span>
              <Switch
                checked={config.cnpjAutofill === true}
                disabled={isBuiltin}
                onChange={(v) =>
                  setConfig((c) => ({ ...c, cnpjAutofill: v }))
                }
              />
            </div>
          ) : null}

          {showOptions ? (
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="text-foreground/80 block text-paragraph-sm font-medium">
                  {def.type === 'DROPDOWN'
                    ? 'Opções de menu suspenso'
                    : 'Opções'}
                </label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setSortOpen((v) => !v)}
                    className="text-muted-foreground hover:text-foreground inline-flex h-7 cursor-pointer items-center gap-1 rounded-md px-2 text-paragraph-xs"
                  >
                    {sortMode === 'manual'
                      ? 'Manual'
                      : sortMode === 'alpha'
                        ? 'Alfabético'
                        : 'Alfabético (Z-A)'}
                    <ChevronDown className="h-3.5 w-3.5" />
                  </button>
                  {sortOpen ? (
                    <>
                      <button
                        type="button"
                        aria-hidden="true"
                        tabIndex={-1}
                        className="fixed inset-0 z-40 cursor-default"
                        onClick={() => setSortOpen(false)}
                      />
                      <div className="bg-popover absolute right-0 z-50 mt-1 w-40 rounded-md border p-1 shadow-regular-md">
                        {(['manual', 'alpha', 'alpha_desc'] as const).map(
                          (m) => (
                            <button
                              key={m}
                              type="button"
                              onClick={() => {
                                setSortMode(m);
                                setSortOpen(false);
                              }}
                              className="hover:bg-accent flex w-full cursor-pointer items-center rounded-md px-2 py-1.5 text-left text-paragraph-sm"
                            >
                              {m === 'manual'
                                ? 'Manual'
                                : m === 'alpha'
                                  ? 'Alfabético'
                                  : 'Alfabético (Z-A)'}
                            </button>
                          ),
                        )}
                      </div>
                    </>
                  ) : null}
                </div>
              </div>
              <div className="space-y-1.5">
                {(sortMode === 'manual'
                  ? options.map((o, i) => ({ o, i }))
                  : [...options.map((o, i) => ({ o, i }))].sort((a, b) =>
                      sortMode === 'alpha'
                        ? a.o.value.localeCompare(b.o.value)
                        : b.o.value.localeCompare(a.o.value),
                    )
                ).map(({ o, i }) => (
                  <div
                    key={i}
                    draggable={sortMode === 'manual' && !isBuiltin}
                    onDragStart={(e) => {
                      setDraggingIdx(i);
                      e.dataTransfer.effectAllowed = 'move';
                    }}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (draggingIdx == null || draggingIdx === i) return;
                      setOptions((prev) => {
                        const next = [...prev];
                        const [moved] = next.splice(draggingIdx, 1);
                        next.splice(i, 0, moved);
                        return next;
                      });
                      setDefaultIndex((cur) => {
                        if (cur == null) return cur;
                        if (cur === draggingIdx) return i;
                        if (draggingIdx < cur && cur <= i) return cur - 1;
                        if (i <= cur && cur < draggingIdx) return cur + 1;
                        return cur;
                      });
                      setDraggingIdx(null);
                    }}
                    onDragEnd={() => setDraggingIdx(null)}
                    className={cn(
                      'flex items-center gap-2',
                      draggingIdx === i ? 'opacity-50' : '',
                    )}
                  >
                    {sortMode === 'manual' && !isBuiltin ? (
                      <GripVertical
                        aria-hidden="true"
                        className="text-muted-foreground h-4 w-4 shrink-0 cursor-grab"
                      />
                    ) : null}
                    <div className="relative">
                      <button
                        type="button"
                        aria-label={`Cor da opção ${i + 1}`}
                        disabled={isBuiltin}
                        onClick={() =>
                          setOpenColorIdx((cur) => (cur === i ? null : i))
                        }
                        className="size-3 shrink-0 cursor-pointer rounded-full transition-transform hover:scale-110 disabled:cursor-not-allowed disabled:opacity-50"
                        style={{ backgroundColor: o.color }}
                      />
                      {openColorIdx === i && !isBuiltin ? (
                        <>
                          <button
                            type="button"
                            aria-hidden="true"
                            tabIndex={-1}
                            className="fixed inset-0 z-40 cursor-default"
                            onClick={() => setOpenColorIdx(null)}
                          />
                          <div className="bg-popover absolute left-0 top-5 z-50 grid w-44 grid-cols-5 gap-1.5 rounded-md border p-2 shadow-regular-md">
                            {OPTION_PALETTE.map((c) => (
                              <button
                                key={c}
                                type="button"
                                aria-label={`Definir cor ${c}`}
                                onClick={() => {
                                  setOptions((prev) =>
                                    prev.map((p, idx) =>
                                      idx === i ? { ...p, color: c } : p,
                                    ),
                                  );
                                  setOpenColorIdx(null);
                                }}
                                className={cn(
                                  'size-6 cursor-pointer rounded-full transition-all hover:scale-110',
                                  o.color === c
                                    ? 'ring-foreground ring-2 ring-offset-1'
                                    : '',
                                )}
                                style={{ backgroundColor: c }}
                              />
                            ))}
                          </div>
                        </>
                      ) : null}
                    </div>
                    <input
                      type="text"
                      value={o.value}
                      disabled={isBuiltin}
                      onChange={(e) =>
                        setOptions((prev) =>
                          prev.map((p, idx) =>
                            idx === i ? { ...p, value: e.target.value } : p,
                          ),
                        )
                      }
                      placeholder={`Opção ${i + 1}`}
                      className="border-input h-8 flex-1 rounded-md border bg-transparent px-2 text-paragraph-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-50"
                    />
                    <button
                      type="button"
                      aria-label={
                        defaultIndex === i
                          ? `Remover padrão da opção ${i + 1}`
                          : `Definir opção ${i + 1} como padrão`
                      }
                      disabled={isBuiltin}
                      onClick={() =>
                        setDefaultIndex((cur) => (cur === i ? null : i))
                      }
                      className={cn(
                        'inline-flex shrink-0 cursor-pointer items-center rounded px-1.5 py-0.5 text-paragraph-xs transition-colors disabled:cursor-not-allowed disabled:opacity-50',
                        defaultIndex === i
                          ? 'text-foreground font-medium'
                          : 'text-muted-foreground hover:text-foreground',
                      )}
                    >
                      {defaultIndex === i ? 'Padrão' : 'Definir padrão'}
                    </button>
                    <button
                      type="button"
                      aria-label={`Remover opção ${i + 1}`}
                      disabled={isBuiltin}
                      onClick={() => {
                        setOptions((prev) =>
                          prev.filter((_, idx) => idx !== i),
                        );
                        setDefaultIndex((cur) =>
                          cur === i
                            ? null
                            : cur != null && cur > i
                              ? cur - 1
                              : cur,
                        );
                      }}
                      className="text-muted-foreground hover:text-destructive inline-flex size-6 shrink-0 cursor-pointer items-center justify-center rounded disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
                {!isBuiltin ? (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() =>
                        setOptions((prev) => [
                          ...prev,
                          { value: '', color: paletteColor(prev.length) },
                        ])
                      }
                      className="text-muted-foreground hover:text-foreground inline-flex cursor-pointer items-center gap-1.5 rounded-md px-1 py-1 text-paragraph-xs transition-colors"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Adicionar opção
                    </button>
                    <button
                      type="button"
                      disabled
                      title="Em breve"
                      aria-label="Sugerir opções com IA"
                      className="text-muted-foreground inline-flex h-7 cursor-not-allowed items-center justify-center gap-1 rounded-md px-2 text-paragraph-xs opacity-50"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      IA
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          <div className="border-t pt-3">
            <button
              type="button"
              onClick={() => setMoreOpen((v) => !v)}
              className="flex w-full cursor-pointer items-center justify-between text-paragraph-sm font-medium"
            >
              Mais configurações e permissões
              {moreOpen ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>

            {moreOpen ? (
              <div className="mt-4 space-y-5">
                <div>
                  <FieldLabel>Descrição</FieldLabel>
                  <textarea
                    value={description}
                    disabled={isBuiltin}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Explique aos outros usuários como usar este campo"
                    className="border-input min-h-[60px] w-full resize-none rounded-md border bg-transparent px-3 py-2 text-paragraph-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-50"
                  />
                </div>

                {!showOptions ? (
                  <div>
                    <FieldLabel>Valor padrão</FieldLabel>
                    <input
                      type="text"
                      value={defaultValue}
                      disabled={isBuiltin}
                      onChange={(e) => setDefaultValue(e.target.value)}
                      placeholder={TYPE_DISPLAY[def.type]}
                      className="border-input h-9 w-full rounded-md border bg-transparent px-3 text-paragraph-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-50"
                    />
                  </div>
                ) : null}

                <div>
                  <FieldLabel>Permissões</FieldLabel>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        toast.info('Permissões por campo — em breve.')
                      }
                      className="border-input flex h-9 flex-1 cursor-pointer items-center justify-between rounded-md border bg-transparent px-3 text-paragraph-sm"
                    >
                      Padrão do Espaço de trabalho
                      <ChevronDown className="h-3.5 w-3.5 opacity-60" />
                    </button>
                    <span
                      aria-hidden="true"
                      className="text-muted-foreground inline-flex size-9 items-center justify-center rounded-md border"
                    >
                      <Lock className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </div>

                <div>
                  <div className="mb-2 flex items-center gap-1.5">
                    <span className="text-foreground/80 text-paragraph-sm font-medium">
                      Exceções
                    </span>
                    <Info className="text-muted-foreground h-3.5 w-3.5" />
                  </div>
                  <p className="text-muted-foreground mb-2 text-paragraph-xs">
                    Todos os usuários terão as permissões definidas acima. Para
                    personalizar o acesso por usuário, adicione exceções.
                  </p>
                  {def.creator ? (
                    <div className="flex items-center justify-between rounded-md px-1 py-1.5">
                      <div className="flex items-center gap-2">
                        <div className="bg-muted flex h-6 w-6 items-center justify-center rounded-full text-paragraph-xs font-medium">
                          {def.creator.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-paragraph-sm">
                          {def.creator.name}{' '}
                          <span className="text-muted-foreground">
                            (Criador)
                          </span>
                        </span>
                      </div>
                      <span className="text-muted-foreground inline-flex items-center gap-1 text-paragraph-xs">
                        Permitido editar
                        <ChevronDown className="h-3 w-3" />
                      </span>
                    </div>
                  ) : null}
                  <button
                    type="button"
                    disabled
                    title="Em breve"
                    className="text-muted-foreground mt-1 inline-flex h-8 w-full cursor-not-allowed items-center justify-center gap-1.5 rounded-md bg-muted/50 text-paragraph-sm"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Adicionar exceção
                  </button>
                </div>

                <div>
                  <FieldLabel>Grupo</FieldLabel>
                  <p className="text-muted-foreground mb-2 text-paragraph-xs">
                    Seção colapsável na tarefa (lista ou tipo de tarefa). Use
                    Novo grupo na barra do gerenciador neste escopo.
                  </p>
                  <select
                    value={groupId}
                    disabled={isBuiltin}
                    onChange={(e) => setGroupId(e.target.value)}
                    className="border-input h-9 w-full cursor-pointer rounded-md border bg-transparent px-3 text-paragraph-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-50"
                  >
                    <option value="">Sem grupo</option>
                    {(groupsQuery.data ?? []).map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <FieldLabel>Configurações de exibição</FieldLabel>
                  <div className="space-y-3">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-paragraph-sm">Obrigatório em tarefas</span>
                        <Switch
                          checked={required}
                          onChange={setRequired}
                          disabled={isBuiltin}
                        />
                      </div>
                      <p className="text-muted-foreground mt-1 text-paragraph-xs">
                        Os campos personalizados obrigatórios devem ser
                        preenchidos ao criar tarefas.
                      </p>
                    </div>
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-paragraph-sm">Fixado</span>
                        <Switch
                          checked={pinned}
                          onChange={setPinned}
                          disabled={isBuiltin}
                        />
                      </div>
                      <p className="text-muted-foreground mt-1 text-paragraph-xs">
                        Os campos fixados são sempre exibidos na visualização de
                        tarefas.
                      </p>
                    </div>
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-paragraph-sm">
                          Visíveis para Convidados e Membros limitados
                        </span>
                        <Switch
                          checked={visibleToGuests}
                          onChange={setVisibleToGuests}
                          disabled={isBuiltin}
                        />
                      </div>
                      <p className="text-muted-foreground mt-1 text-paragraph-xs">
                        Os campos personalizados podem ser ocultados ou
                        mostrados aos convidados.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <FieldLabel>
                    Pertence a{' '}
                    <span className="text-destructive">*</span>
                  </FieldLabel>
                  <div className="space-y-1">
                    {def.locations.map((loc) => {
                      const key = `${loc.type}-${loc.id}`;
                      const Icon =
                        loc.type === 'list'
                          ? List
                          : loc.type === 'folder'
                            ? Folder
                            : Building2;
                      const opt = locationOptions.find(
                        (o) => o.value === `${loc.type}:${loc.id}`,
                      );
                      const name =
                        opt?.label.split('·')[1]?.trim() ??
                        LOC_TYPE_LABEL[loc.type];
                      const others = locationOptions.filter(
                        (o) => o.value !== `${loc.type}:${loc.id}`,
                      );
                      return (
                        <div
                          key={key}
                          className="hover:bg-muted/40 group flex items-center justify-between rounded-md px-2 py-1.5"
                        >
                          <div className="flex min-w-0 items-center gap-2">
                            <Icon className="text-muted-foreground h-4 w-4 shrink-0" />
                            <span className="text-paragraph-sm truncate">
                              {name}
                            </span>
                          </div>
                          {!isBuiltin ? (
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                              <div className="relative">
                                <button
                                  type="button"
                                  aria-label="Alterar localização"
                                  onClick={() =>
                                    setChangeLocOpenKey((cur) =>
                                      cur === key ? null : key,
                                    )
                                  }
                                  className="text-muted-foreground hover:text-foreground inline-flex size-6 cursor-pointer items-center justify-center rounded"
                                >
                                  <ArrowRightLeft className="h-3.5 w-3.5" />
                                </button>
                                {changeLocOpenKey === key ? (
                                  <>
                                    <button
                                      type="button"
                                      aria-hidden="true"
                                      tabIndex={-1}
                                      className="fixed inset-0 z-40 cursor-default"
                                      onClick={() =>
                                        setChangeLocOpenKey(null)
                                      }
                                    />
                                    <div className="bg-popover absolute right-0 z-50 mt-1 max-h-64 w-56 overflow-auto rounded-md border p-1 shadow-regular-md">
                                      {others.map((o) => (
                                        <button
                                          key={o.value}
                                          type="button"
                                          onClick={async () => {
                                            setChangeLocOpenKey(null);
                                            try {
                                              await removeLocation.mutateAsync(
                                                {
                                                  customFieldId: def.id,
                                                  locationType: loc.type,
                                                  locationId: loc.id,
                                                },
                                              );
                                              const [t, id] = o.value.split(
                                                ':',
                                              ) as [
                                                CustomFieldLocationType,
                                                string,
                                              ];
                                              await addLocation.mutateAsync({
                                                customFieldId: def.id,
                                                targetId: id,
                                                locationType: t,
                                                action: 'ADD',
                                              });
                                              toast.success(
                                                'Localização alterada.',
                                              );
                                            } catch {
                                              toast.error(
                                                'Erro ao alterar localização.',
                                              );
                                            }
                                          }}
                                          className="hover:bg-accent flex w-full cursor-pointer items-center rounded-md px-2 py-1.5 text-left text-paragraph-sm"
                                        >
                                          {o.label}
                                        </button>
                                      ))}
                                    </div>
                                  </>
                                ) : null}
                              </div>
                              <button
                                type="button"
                                aria-label="Remover localização"
                                onClick={() =>
                                  handleRemoveLocation(loc.type, loc.id)
                                }
                                disabled={removeLocation.isPending}
                                className="text-muted-foreground hover:text-destructive inline-flex size-6 cursor-pointer items-center justify-center rounded disabled:opacity-50"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                    {!isBuiltin ? (
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setAddLocOpen((v) => !v)}
                          disabled={addLocation.isPending}
                          className="text-muted-foreground hover:text-foreground inline-flex w-full cursor-pointer items-center gap-1.5 rounded-md px-2 py-1.5 text-paragraph-sm disabled:opacity-50"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Adicionar localização
                        </button>
                        {addLocOpen ? (
                          <>
                            <button
                              type="button"
                              aria-hidden="true"
                              tabIndex={-1}
                              className="fixed inset-0 z-40 cursor-default"
                              onClick={() => setAddLocOpen(false)}
                            />
                            <div className="bg-popover absolute left-0 right-0 z-50 mt-1 max-h-64 overflow-auto rounded-md border p-1 shadow-regular-md">
                              {locationOptions
                                .filter(
                                  (o) =>
                                    !def.locations.some(
                                      (l) =>
                                        `${l.type}:${l.id}` === o.value,
                                    ),
                                )
                                .map((o) => (
                                  <button
                                    key={o.value}
                                    type="button"
                                    onClick={() => {
                                      setAddLocOpen(false);
                                      handleAddLocation(o.value);
                                    }}
                                    className="hover:bg-accent flex w-full cursor-pointer items-center rounded-md px-2 py-1.5 text-left text-paragraph-sm"
                                  >
                                    {o.label}
                                  </button>
                                ))}
                            </div>
                          </>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          {!isBuiltin ? (
            <div className="border-destructive/30 mt-2 border-t pt-4">
              <FieldLabel>
                <span className="text-destructive">Danger Zone</span>
              </FieldLabel>
              <p className="text-muted-foreground mb-2 text-paragraph-xs">
                Excluir o campo remove a definição e todos os valores
                vinculados às tarefas. Ação não pode ser desfeita.
              </p>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
                className="border-destructive/40 text-destructive hover:bg-destructive/10 inline-flex h-9 cursor-pointer items-center gap-2 rounded-md border bg-background px-3 text-paragraph-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Excluir campo
              </button>
            </div>
          ) : null}
        </div>
      </div>

      <footer className="border-border flex shrink-0 items-center justify-end gap-2 border-t px-4 py-3">
        <button
          type="button"
          onClick={() => onClose?.()}
          className="inline-flex h-9 cursor-pointer items-center justify-center rounded-md border bg-background px-4 text-paragraph-sm font-medium shadow-regular-xs transition-all hover:bg-accent"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={isBuiltin || updateMutation.isPending}
          className="bg-primary-base text-static-white inline-flex h-9 cursor-pointer items-center justify-center rounded-md px-4 text-paragraph-sm font-medium shadow-regular-xs transition-all hover:bg-primary-dark disabled:pointer-events-none disabled:opacity-50"
        >
          {updateMutation.isPending ? 'Salvando...' : 'Salvar'}
        </button>
      </footer>
    </aside>
  );
}
