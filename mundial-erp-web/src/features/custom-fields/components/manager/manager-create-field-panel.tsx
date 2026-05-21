'use client';

import { useEffect, useState } from 'react';
import {
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
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { useSidebarTree } from '@/features/navigation/hooks/use-sidebar-tree';
import { cn } from '@/lib/cn';
import { useCreateCustomField } from '../../hooks/use-custom-field-definitions';
import type { ManagerView } from '../../hooks/use-custom-fields-manager-state';
import type {
  CustomFieldConfig,
  CustomFieldType,
} from '../../types/custom-field.types';

interface ManagerCreateFieldPanelProps {
  type: CustomFieldType;
  view: ManagerView;
  onClose: () => void;
}

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

const NEEDS_OPTIONS = new Set<CustomFieldType>(['SELECT', 'DROPDOWN', 'LABEL']);

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
    default:
      return {};
  }
}

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

function scopeFromView(view: ManagerView): {
  spaceId?: string;
  folderId?: string;
  listId?: string;
  taskTypeId?: string;
} {
  switch (view.kind) {
    case 'space':
      return { spaceId: view.spaceId };
    case 'folder':
      return { folderId: view.folderId };
    case 'list':
      return { listId: view.listId };
    case 'taskType':
      return { taskTypeId: view.taskTypeId };
    default:
      return {};
  }
}

function Switch({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
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

export function ManagerCreateFieldPanel({
  type,
  view,
  onClose,
}: ManagerCreateFieldPanelProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [defaultValue, setDefaultValue] = useState('');
  const [options, setOptions] = useState<OptionDraft[]>([]);
  const [openColorIdx, setOpenColorIdx] = useState<number | null>(null);
  const [defaultIndex, setDefaultIndex] = useState<number | null>(null);
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null);
  const [config, setConfig] = useState<CustomFieldConfig>(defaultConfig(type));
  const [required, setRequired] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [visibleToGuests, setVisibleToGuests] = useState(true);
  const [moreOpen, setMoreOpen] = useState(false);
  const [sortMode, setSortMode] = useState<'manual' | 'alpha' | 'alpha_desc'>(
    'manual',
  );
  const [sortOpen, setSortOpen] = useState(false);

  const createMutation = useCreateCustomField();
  const resetCreate = createMutation.reset;
  const treeQuery = useSidebarTree();

  useEffect(() => {
    setName('');
    setDescription('');
    setDefaultValue('');
    setOptions(
      NEEDS_OPTIONS.has(type)
        ? [
            { value: '', color: paletteColor(0) },
            { value: '', color: paletteColor(1) },
          ]
        : [],
    );
    setOpenColorIdx(null);
    setDefaultIndex(null);
    setDraggingIdx(null);
    setRequired(false);
    setPinned(false);
    setVisibleToGuests(true);
    setMoreOpen(false);
    resetCreate();
  }, [type, resetCreate]);

  const needsOptions = NEEDS_OPTIONS.has(type);

  const handleCreate = () => {
    if (name.trim().length === 0) return;
    const cleanOptions = needsOptions
      ? options
          .filter((o) => o.value.trim().length > 0)
          .map((o) => ({
            value: o.value.trim(),
            label: o.value.trim(),
            color: o.color,
          }))
      : undefined;
    const resolvedDefaultValue = needsOptions
      ? defaultIndex != null
        ? options[defaultIndex]?.value.trim() || undefined
        : undefined
      : defaultValue.trim() || undefined;
    createMutation.mutate(
      {
        name: name.trim(),
        label: name.trim(),
        type,
        required,
        pinned,
        visibleToGuests,
        description: description.trim() || undefined,
        defaultValue: resolvedDefaultValue,
        options: cleanOptions,
        config: Object.keys(config).length > 0 ? config : undefined,
        ...scopeFromView(view),
      },
      {
        onError: () =>
          toast.error('Erro ao criar — confira nome, tipo e escopo.'),
        onSuccess: () => {
          toast.success('Campo criado.');
          onClose();
        },
      },
    );
  };

  return (
    <aside
      aria-label="Criar campo"
      className="border-border bg-background flex min-h-0 w-[min(100%,340px)] min-w-[300px] shrink-0 flex-col border-l"
    >
      <header className="border-border flex shrink-0 items-center justify-between border-b px-4 py-3">
        <button
          type="button"
          onClick={() =>
            toast.info('Escolha o tipo ao criar um novo campo.')
          }
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-1 text-paragraph-sm font-medium transition-colors hover:bg-accent"
        >
          {TYPE_LABEL[type]}
          <ChevronDown className="h-3.5 w-3.5 opacity-60" />
        </button>
        <button
          type="button"
          aria-label="Fechar painel"
          onClick={onClose}
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
                autoFocus
                onChange={(e) => setName(e.target.value)}
                placeholder="Insira o nome..."
                className="border-input h-9 w-full rounded-md border bg-transparent pl-3 pr-9 text-paragraph-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
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

          {type === 'CURRENCY' ? (
            <div>
              <FieldLabel>Moeda</FieldLabel>
              <select
                value={config.currency ?? 'BRL'}
                onChange={(e) =>
                  setConfig((c) => ({ ...c, currency: e.target.value }))
                }
                className="border-input h-9 w-full cursor-pointer rounded-md border bg-transparent px-3 text-paragraph-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
              >
                {CURRENCY_CODES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          {type === 'DATE' ? (
            <div className="flex items-center justify-between">
              <span className="text-foreground/80 text-paragraph-sm font-medium">
                Incluir hora
              </span>
              <Switch
                checked={config.includeTime === true}
                onChange={(v) =>
                  setConfig((c) => ({ ...c, includeTime: v }))
                }
              />
            </div>
          ) : null}

          {type === 'RATING' ? (
            <div>
              <FieldLabel>Estrelas máximas</FieldLabel>
              <input
                type="number"
                min={1}
                max={10}
                value={config.maxStars ?? 5}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  if (!Number.isFinite(n)) return;
                  setConfig((c) => ({
                    ...c,
                    maxStars: Math.min(10, Math.max(1, Math.round(n))),
                  }));
                }}
                className="border-input h-9 w-full rounded-md border bg-transparent px-3 text-paragraph-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
              />
            </div>
          ) : null}

          {type === 'NUMBER' || type === 'PERCENTAGE' ? (
            <div>
              <FieldLabel>Limites</FieldLabel>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  placeholder="Mín"
                  value={config.min ?? ''}
                  onChange={(e) =>
                    setConfig((c) => ({
                      ...c,
                      min: e.target.value === '' ? undefined : Number(e.target.value),
                    }))
                  }
                  className="border-input h-9 w-1/2 rounded-md border bg-transparent px-3 text-paragraph-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                />
                <input
                  type="number"
                  placeholder="Máx"
                  value={config.max ?? ''}
                  onChange={(e) =>
                    setConfig((c) => ({
                      ...c,
                      max: e.target.value === '' ? undefined : Number(e.target.value),
                    }))
                  }
                  className="border-input h-9 w-1/2 rounded-md border bg-transparent px-3 text-paragraph-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                />
              </div>
            </div>
          ) : null}

          {type === 'PEOPLE' ? (
            <div className="flex items-center justify-between">
              <span className="text-foreground/80 text-paragraph-sm font-medium">
                Permitir múltiplos
              </span>
              <Switch
                checked={config.multiple !== false}
                onChange={(v) =>
                  setConfig((c) => ({ ...c, multiple: v }))
                }
              />
            </div>
          ) : null}

          {type === 'CNPJ' ? (
            <div className="flex items-center justify-between">
              <span className="text-foreground/80 text-paragraph-sm font-medium">
                Autopreencher pela Receita Federal
              </span>
              <Switch
                checked={config.cnpjAutofill === true}
                onChange={(v) =>
                  setConfig((c) => ({ ...c, cnpjAutofill: v }))
                }
              />
            </div>
          ) : null}

          {needsOptions ? (
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="text-foreground/80 block text-paragraph-sm font-medium">
                  {type === 'DROPDOWN' ? 'Opções de menu suspenso' : 'Opções'}{' '}
                  <span className="text-destructive">*</span>
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
                    draggable={sortMode === 'manual'}
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
                    {sortMode === 'manual' ? (
                      <GripVertical
                        aria-hidden="true"
                        className="text-muted-foreground h-4 w-4 shrink-0 cursor-grab"
                      />
                    ) : null}
                    <div className="relative">
                      <button
                        type="button"
                        aria-label={`Cor da opção ${i + 1}`}
                        onClick={() =>
                          setOpenColorIdx((cur) => (cur === i ? null : i))
                        }
                        className="size-3 shrink-0 cursor-pointer rounded-full transition-transform hover:scale-110"
                        style={{ backgroundColor: o.color }}
                      />
                      {openColorIdx === i ? (
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
                      onChange={(e) =>
                        setOptions((prev) =>
                          prev.map((p, idx) =>
                            idx === i ? { ...p, value: e.target.value } : p,
                          ),
                        )
                      }
                      placeholder={`Opção ${i + 1}`}
                      className="border-input h-8 flex-1 rounded-md border bg-transparent px-2 text-paragraph-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                    />
                    <button
                      type="button"
                      aria-label={
                        defaultIndex === i
                          ? `Remover padrão da opção ${i + 1}`
                          : `Definir opção ${i + 1} como padrão`
                      }
                      onClick={() =>
                        setDefaultIndex((cur) => (cur === i ? null : i))
                      }
                      className={cn(
                        'inline-flex shrink-0 cursor-pointer items-center rounded px-1.5 py-0.5 text-paragraph-xs transition-colors',
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
                      onClick={() => {
                        setOptions((prev) =>
                          prev.filter((_, idx) => idx !== i),
                        );
                        setDefaultIndex((cur) =>
                          cur === i ? null : cur != null && cur > i ? cur - 1 : cur,
                        );
                      }}
                      className="text-muted-foreground hover:text-destructive inline-flex size-6 shrink-0 cursor-pointer items-center justify-center rounded"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
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
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Explique aos outros usuários como usar este campo"
                    className="border-input min-h-[60px] w-full resize-none rounded-md border bg-transparent px-3 py-2 text-paragraph-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  />
                </div>

                {!needsOptions ? (
                  <div>
                    <FieldLabel>Valor padrão</FieldLabel>
                    <input
                      type="text"
                      value={defaultValue}
                      onChange={(e) => setDefaultValue(e.target.value)}
                      placeholder={TYPE_LABEL[type]}
                      className="border-input h-9 w-full rounded-md border bg-transparent px-3 text-paragraph-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
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
                  <div className="flex items-center justify-between rounded-md px-1 py-1.5">
                    <div className="flex items-center gap-2">
                      <div className="bg-muted flex h-6 w-6 items-center justify-center rounded-full text-paragraph-xs font-medium">
                        V
                      </div>
                      <span className="text-paragraph-sm">
                        Você{' '}
                        <span className="text-muted-foreground">(Criador)</span>
                      </span>
                    </div>
                    <span className="text-muted-foreground inline-flex items-center gap-1 text-paragraph-xs">
                      Permitido editar
                      <ChevronDown className="h-3 w-3" />
                    </span>
                  </div>
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
                  <FieldLabel>Configurações de exibição</FieldLabel>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-paragraph-sm">Obrigatório em tarefas</span>
                      <Switch checked={required} onChange={setRequired} />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-paragraph-sm">Fixado</span>
                      <Switch checked={pinned} onChange={setPinned} />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-paragraph-sm">
                        Visíveis para Convidados e Membros limitados
                      </span>
                      <Switch
                        checked={visibleToGuests}
                        onChange={setVisibleToGuests}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          {createMutation.isError ? (
            <p className="text-destructive text-paragraph-xs">
              Erro ao criar — confira nome, tipo e escopo.
            </p>
          ) : null}

          {(() => {
            const tree = treeQuery.data ?? [];
            let label = 'Espaço de trabalho';
            let Icon = Building2;
            if (view.kind === 'space') {
              Icon = Building2;
              const sp = tree.find((s) => s.id === view.spaceId);
              label = sp?.name ?? 'Departamento';
            } else if (view.kind === 'folder') {
              Icon = Folder;
              for (const sp of tree) {
                const a = sp.areas?.find((x) => x.id === view.folderId);
                if (a) {
                  label = a.name;
                  break;
                }
              }
            } else if (view.kind === 'list') {
              Icon = List;
              for (const sp of tree) {
                for (const proc of sp.directProcesses ?? [])
                  if (proc.id === view.listId) label = proc.name;
                for (const a of sp.areas ?? [])
                  for (const p of a.processes ?? [])
                    if (p.id === view.listId) label = p.name;
              }
            }
            return (
              <div className="border-t pt-3">
                <FieldLabel>Pertence a</FieldLabel>
                <p className="text-muted-foreground mb-2 text-paragraph-xs">
                  O campo existirá em todas as tarefas nas localizações abaixo
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground inline-flex size-5 items-center justify-center rounded">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="text-paragraph-sm">{label}</span>
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      <footer className="border-border flex shrink-0 items-center justify-end gap-2 border-t px-4 py-3">
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-9 cursor-pointer items-center justify-center rounded-md border bg-background px-4 text-paragraph-sm font-medium shadow-regular-xs transition-all hover:bg-accent"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={handleCreate}
          disabled={name.trim().length === 0 || createMutation.isPending}
          className="bg-primary-base text-static-white inline-flex h-9 cursor-pointer items-center justify-center rounded-md px-4 text-paragraph-sm font-medium shadow-regular-xs transition-all hover:bg-primary-dark disabled:pointer-events-none disabled:opacity-50"
        >
          {createMutation.isPending ? 'Criando...' : 'Criar'}
        </button>
      </footer>
    </aside>
  );
}
