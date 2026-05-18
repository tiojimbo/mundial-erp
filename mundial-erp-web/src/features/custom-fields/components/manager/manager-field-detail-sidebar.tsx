'use client';

import { useEffect, useState } from 'react';
import { ListTree, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/cn';
import {
  useAddCustomFieldLocation,
  useDeleteCustomField,
  useRemoveCustomFieldLocation,
  useUpdateCustomField,
} from '../../hooks/use-custom-field-definitions';
import { useSidebarTree } from '@/features/navigation/hooks/use-sidebar-tree';
import type {
  CustomFieldDefinition,
  CustomFieldLocationType,
  CustomFieldType,
  ManagerCustomFieldItem,
} from '../../types/custom-field.types';

interface ManagerFieldDetailSidebarProps {
  def: ManagerCustomFieldItem | null;
  onDeleted: () => void;
  onClose?: () => void;
}

const TYPES_WITH_OPTIONS = new Set(['SELECT', 'LABEL', 'DROPDOWN']);

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

function defaultOptionsRaw(def: CustomFieldDefinition | null): string {
  if (!def) return '';
  if (Array.isArray(def.options) && def.options.length > 0) {
    return def.options
      .map((opt) => {
        if (typeof opt === 'string') return opt;
        if (
          typeof opt === 'object' &&
          opt !== null &&
          typeof (opt as { value?: unknown }).value === 'string'
        ) {
          return (opt as { value: string }).value;
        }
        return null;
      })
      .filter((v): v is string => v !== null)
      .join('\n');
  }
  return (def.config?.options ?? []).map((opt) => opt.value).join('\n');
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-muted-foreground mb-3 text-xs font-semibold tracking-wider uppercase">
      {children}
    </h3>
  );
}

function Separator() {
  return <div role="none" className="bg-border h-px w-full shrink-0" />;
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
        'peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
        checked ? 'bg-primary' : 'bg-input',
      )}
    >
      <span
        data-state={checked ? 'checked' : 'unchecked'}
        className={cn(
          'pointer-events-none block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform',
          checked ? 'translate-x-5' : 'translate-x-0',
        )}
      />
    </button>
  );
}

function SettingRow({
  title,
  description,
  checked,
  onChange,
  disabled,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="space-y-0.5">
        <label className="text-sm font-medium select-none">{title}</label>
        <p className="text-muted-foreground text-xs">{description}</p>
      </div>
      <Switch checked={checked} onChange={onChange} disabled={disabled} />
    </div>
  );
}

export function ManagerFieldDetailSidebar({
  def,
  onDeleted,
  onClose,
}: ManagerFieldDetailSidebarProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [required, setRequired] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [visibleToGuests, setVisibleToGuests] = useState(true);
  const [groupId, setGroupId] = useState<string>('');
  const [fillMethod, setFillMethod] = useState<'MANUAL' | 'AI'>('MANUAL');
  const [optionsRaw, setOptionsRaw] = useState('');
  const [pickerValue, setPickerValue] = useState('');

  const updateMutation = useUpdateCustomField();
  const deleteMutation = useDeleteCustomField();
  const addLocation = useAddCustomFieldLocation();
  const removeLocation = useRemoveCustomFieldLocation();
  const treeQuery = useSidebarTree();

  useEffect(() => {
    if (!def) return;
    setName(def.name);
    setDescription(def.description ?? '');
    setRequired(def.required);
    setPinned(def.pinned);
    setVisibleToGuests(def.visibleToGuests);
    setGroupId(def.groupId ?? '');
    setFillMethod(
      (def.fillMethod ?? '').toUpperCase().includes('AI') ? 'AI' : 'MANUAL',
    );
    setOptionsRaw(defaultOptionsRaw(def));
  }, [def]);

  if (!def) {
    return (
      <aside
        aria-label="Detalhe do campo"
        className="border-border bg-background flex min-h-0 w-[min(100%,400px)] min-w-[280px] shrink-0 flex-col border-l"
      >
        <div className="text-muted-foreground flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
          <ListTree className="h-10 w-10 opacity-40" aria-hidden="true" />
          <p className="text-sm">
            Selecione um campo na lista para editar ou use{' '}
            <span className="text-foreground font-medium">Novo campo</span> na
            barra acima.
          </p>
        </div>
      </aside>
    );
  }

  const isBuiltin = def.fixed;
  const showOptions = TYPES_WITH_OPTIONS.has(def.type);
  const locationsCount = def.locations?.length ?? 0;

  const handleSave = () => {
    if (isBuiltin) return;
    const parsedOptions = showOptions
      ? optionsRaw
          .split(/[\n,]+/)
          .map((opt) => opt.trim())
          .filter((opt) => opt.length > 0)
      : undefined;
    updateMutation.mutate(
      {
        id: def.id,
        payload: {
          name,
          label: name,
          description: description || undefined,
          required,
          pinned,
          visibleToGuests,
          fillMethod,
          groupId: groupId || undefined,
          options: parsedOptions,
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
          setPickerValue('');
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
      className="border-border bg-background flex min-h-0 w-[min(100%,400px)] min-w-[280px] shrink-0 flex-col border-l"
    >
      <div className="bg-background flex h-full min-h-0 w-full flex-col">
        <header className="border-border flex shrink-0 items-center justify-between border-b px-4 py-3">
          <h2 className="text-base font-semibold">
            {TYPE_DISPLAY[def.type]}
          </h2>
          <button
            type="button"
            aria-label="Fechar painel"
            onClick={() => onClose?.()}
            className="inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-md transition-all hover:bg-accent hover:text-accent-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="space-y-6 px-6 py-6">
            <section>
              <SectionTitle>Geral</SectionTitle>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="flex items-center gap-2 text-sm font-medium select-none">
                    Nome do campo <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    disabled={isBuiltin}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Nome do campo"
                    className="border-input flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-muted-foreground flex items-center gap-2 text-sm font-medium select-none">
                    Descrição{' '}
                    <span className="text-muted-foreground/60">(opcional)</span>
                  </label>
                  <textarea
                    value={description}
                    disabled={isBuiltin}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Veja a descrição ao passar o mouse sobre os campos em tarefas ou visualizações"
                    className="border-input flex min-h-[60px] w-full resize-none rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="flex items-center gap-2 text-sm font-medium select-none">
                    Método de preenchimento
                  </label>
                  <div className="flex rounded-md border">
                    <button
                      type="button"
                      disabled={isBuiltin}
                      onClick={() => setFillMethod('MANUAL')}
                      className={cn(
                        'flex-1 px-3 py-1.5 text-sm transition-colors disabled:opacity-50',
                        fillMethod === 'MANUAL'
                          ? 'bg-accent font-medium'
                          : 'text-muted-foreground hover:bg-muted/50',
                      )}
                    >
                      Preenchimento manual
                    </button>
                    <button
                      type="button"
                      disabled={isBuiltin}
                      onClick={() => setFillMethod('AI')}
                      className={cn(
                        'flex-1 px-3 py-1.5 text-sm transition-colors disabled:opacity-50',
                        fillMethod === 'AI'
                          ? 'bg-accent font-medium'
                          : 'text-muted-foreground hover:bg-muted/50',
                      )}
                    >
                      Preencher com IA
                    </button>
                  </div>
                </div>
              </div>
            </section>

            <Separator />

            <section>
              <SectionTitle>Tipo do campo</SectionTitle>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">
                    {TYPE_DISPLAY[def.type]}
                  </span>
                </div>
              </div>
            </section>

            <Separator />

            <section>
              <SectionTitle>Campo pertence a</SectionTitle>
              <div className="space-y-2">
                {locationsCount > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {def.locations.map((loc) => (
                      <span
                        key={`${loc.type}-${loc.id}`}
                        className="text-foreground inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs"
                      >
                        {LOC_TYPE_LABEL[loc.type]}
                        {!isBuiltin ? (
                          <button
                            type="button"
                            aria-label={`Remover de ${LOC_TYPE_LABEL[loc.type]}`}
                            onClick={() =>
                              handleRemoveLocation(loc.type, loc.id)
                            }
                            disabled={removeLocation.isPending}
                            className="text-muted-foreground hover:text-destructive cursor-pointer disabled:opacity-50"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        ) : null}
                      </span>
                    ))}
                  </div>
                ) : null}
                {!isBuiltin ? (
                  <select
                    aria-label="Adicionar campo a um local"
                    value={pickerValue}
                    disabled={addLocation.isPending}
                    onChange={(e) => {
                      setPickerValue(e.target.value);
                      handleAddLocation(e.target.value);
                    }}
                    className="border-input h-8 w-full cursor-pointer rounded-md border bg-transparent px-2 text-xs shadow-xs outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-50"
                  >
                    <option value="">+ Adicionar campo a um local…</option>
                    {locationOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                ) : null}
              </div>
            </section>

            <Separator />

            <section>
              <SectionTitle>Configurações</SectionTitle>
              <div className="space-y-4">
                <SettingRow
                  title="Obrigatório nas tarefas"
                  description="Os campos personalizados obrigatórios devem ser preenchidos ao criar tarefas"
                  checked={required}
                  onChange={setRequired}
                  disabled={isBuiltin}
                />
                <SettingRow
                  title="Fixado"
                  description="Os campos fixados são sempre exibidos na visualização de tarefas"
                  checked={pinned}
                  onChange={setPinned}
                  disabled={isBuiltin}
                />
                <SettingRow
                  title="Visível para convidados e membros limitados"
                  description="Os campos personalizados podem ser ocultados ou mostrados aos convidados"
                  checked={visibleToGuests}
                  onChange={setVisibleToGuests}
                  disabled={isBuiltin}
                />
              </div>
            </section>

            {showOptions ? (
              <>
                <Separator />
                <section>
                  <SectionTitle>Opções</SectionTitle>
                  <textarea
                    value={optionsRaw}
                    disabled={isBuiltin}
                    onChange={(e) => setOptionsRaw(e.target.value)}
                    placeholder={'A\nB\nC'}
                    className="border-input flex min-h-[80px] w-full resize-none rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </section>
              </>
            ) : null}

            <Separator />

            <section>
              <SectionTitle>Permissões</SectionTitle>
              <div className="space-y-3">
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium select-none">
                    Permissões padrão
                  </label>
                  <p className="text-muted-foreground mb-2 text-xs">
                    Defina o nível de permissão padrão para todos no workspace.
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-foreground inline-flex w-fit items-center justify-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium">
                      Padrão
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        toast.info('Em breve — tornar campo privado.')
                      }
                      className="inline-flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-md border bg-background px-3 text-xs font-medium shadow-xs transition-all hover:bg-accent hover:text-accent-foreground"
                    >
                      Tornar privado
                    </button>
                  </div>
                </div>
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium select-none">
                    Permissões personalizadas
                  </label>
                  <p className="text-muted-foreground mb-2 text-xs">
                    Sobrescreva as permissões padrão para membros ou equipes
                    específicos.
                  </p>
                  {def.creator ? (
                    <div className="flex items-center justify-between rounded-md border px-3 py-2">
                      <div className="flex items-center gap-2">
                        <div className="bg-muted flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium">
                          {def.creator.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-sm">{def.creator.name}</span>
                        <span className="bg-primary/20 text-primary inline-flex w-fit items-center justify-center rounded-md px-2 py-0.5 text-[10px] font-medium">
                          criador
                        </span>
                      </div>
                      <span className="text-muted-foreground text-xs">
                        Pode editar
                      </span>
                    </div>
                  ) : null}
                </div>
              </div>
            </section>

          </div>
        </div>

        <footer className="border-border flex shrink-0 items-center justify-between gap-2 border-t px-4 py-3">
          <button
            type="button"
            aria-label="Excluir campo"
            onClick={handleDelete}
            disabled={isBuiltin || deleteMutation.isPending}
            className="text-destructive hover:bg-destructive/10 inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-md transition-all disabled:pointer-events-none disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onClose?.()}
              className="inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-md border bg-background px-4 py-2 text-sm font-medium shadow-xs transition-all hover:bg-accent hover:text-accent-foreground"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isBuiltin || updateMutation.isPending}
              className="bg-primary text-primary-foreground inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium shadow-xs transition-all hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
            >
              {updateMutation.isPending ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </footer>
      </div>
    </aside>
  );
}
