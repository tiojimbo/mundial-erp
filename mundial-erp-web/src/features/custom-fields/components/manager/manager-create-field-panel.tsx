'use client';

import { useEffect, useState } from 'react';
import { ChevronDown, ChevronRight, X } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/cn';
import { useCreateCustomField } from '../../hooks/use-custom-field-definitions';
import type { ManagerView } from '../../hooks/use-custom-fields-manager-state';
import type { CustomFieldType } from '../../types/custom-field.types';

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

const NEEDS_OPTIONS = new Set<CustomFieldType>([
  'SELECT',
  'DROPDOWN',
  'LABEL',
]);

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
        'peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
        checked ? 'bg-primary' : 'bg-input',
      )}
    >
      <span
        className={cn(
          'pointer-events-none block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform',
          checked ? 'translate-x-5' : 'translate-x-0',
        )}
      />
    </button>
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
  const [optionsRaw, setOptionsRaw] = useState('');
  const [required, setRequired] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [visibleToGuests, setVisibleToGuests] = useState(true);
  const [moreOpen, setMoreOpen] = useState(false);

  const createMutation = useCreateCustomField();
  const resetCreate = createMutation.reset;

  useEffect(() => {
    setName('');
    setDescription('');
    setDefaultValue('');
    setOptionsRaw('');
    setRequired(false);
    setPinned(false);
    setVisibleToGuests(true);
    setMoreOpen(false);
    resetCreate();
  }, [type, resetCreate]);

  const needsOptions = NEEDS_OPTIONS.has(type);

  const handleCreate = () => {
    if (name.trim().length === 0) return;
    const options = needsOptions
      ? optionsRaw
          .split(/[\n,]+/)
          .map((o) => o.trim())
          .filter((o) => o.length > 0)
      : undefined;
    createMutation.mutate(
      {
        name: name.trim(),
        label: name.trim(),
        type,
        required,
        pinned,
        visibleToGuests,
        description: description.trim() || undefined,
        defaultValue: defaultValue.trim() || undefined,
        options,
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
      className="border-border bg-background flex min-h-0 w-[min(100%,400px)] min-w-[280px] shrink-0 flex-col border-l"
    >
      <header className="border-border flex shrink-0 items-center justify-between border-b px-4 py-3">
        <h2 className="text-base font-semibold">{TYPE_LABEL[type]}</h2>
        <button
          type="button"
          aria-label="Fechar painel"
          onClick={onClose}
          className="inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-md transition-all hover:bg-accent hover:text-accent-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="space-y-5 px-6 py-6">
          <div className="space-y-1.5">
            <label className="flex items-center gap-2 text-sm font-medium select-none">
              Nome do campo <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              value={name}
              autoFocus
              onChange={(e) => setName(e.target.value)}
              placeholder="Insira o nome..."
              className="border-input flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
            />
          </div>

          <div className="space-y-1.5">
            <label className="flex items-center gap-2 text-sm font-medium select-none">
              Método de preenchimento
            </label>
            <div className="flex rounded-md border">
              <button
                type="button"
                className="bg-accent flex-1 px-3 py-1.5 text-sm font-medium"
              >
                Preenchimento manual
              </button>
              <button
                type="button"
                disabled
                title="Em breve"
                className="text-muted-foreground flex-1 cursor-not-allowed px-3 py-1.5 text-sm opacity-50"
              >
                Preencher com IA
              </button>
            </div>
          </div>

          {needsOptions ? (
            <div className="space-y-1.5">
              <label className="flex items-center gap-2 text-sm font-medium select-none">
                Opções <span className="text-destructive">*</span>
              </label>
              <textarea
                value={optionsRaw}
                onChange={(e) => setOptionsRaw(e.target.value)}
                placeholder={'A\nB\nC'}
                className="border-input flex min-h-[72px] w-full resize-none rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              />
            </div>
          ) : null}

          <div>
            <button
              type="button"
              onClick={() => setMoreOpen((v) => !v)}
              className="flex w-full items-center justify-between rounded-md py-1 text-sm font-medium"
            >
              Mais configurações e permissões
              {moreOpen ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>
            {moreOpen ? (
              <div className="mt-3 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-muted-foreground text-sm font-medium select-none">
                    Descrição
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Explique aos outros usuários como usar este campo"
                    className="border-input flex min-h-[60px] w-full resize-none rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-muted-foreground text-sm font-medium select-none">
                    Valor padrão
                  </label>
                  <input
                    type="text"
                    value={defaultValue}
                    onChange={(e) => setDefaultValue(e.target.value)}
                    placeholder={TYPE_LABEL[type]}
                    className="border-input flex h-9 w-full rounded-md border bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  />
                </div>
                <div className="rounded-md border border-dashed px-3 py-2">
                  <p className="text-muted-foreground text-xs">
                    Permissões e exceções por campo — em breve.
                  </p>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Obrigatório em tarefas</span>
                    <Switch checked={required} onChange={setRequired} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Fixado</span>
                    <Switch checked={pinned} onChange={setPinned} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">
                      Visíveis para Convidados e Membros limitados
                    </span>
                    <Switch
                      checked={visibleToGuests}
                      onChange={setVisibleToGuests}
                    />
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          {createMutation.isError ? (
            <p className="text-destructive text-xs">
              Erro ao criar — confira nome, tipo e escopo.
            </p>
          ) : null}
        </div>
      </div>

      <footer className="border-border flex shrink-0 items-center justify-end gap-2 border-t px-4 py-3">
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-9 cursor-pointer items-center justify-center rounded-md border bg-background px-4 py-2 text-sm font-medium shadow-xs transition-all hover:bg-accent hover:text-accent-foreground"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={handleCreate}
          disabled={name.trim().length === 0 || createMutation.isPending}
          className="bg-primary text-primary-foreground inline-flex h-9 cursor-pointer items-center justify-center rounded-md px-4 py-2 text-sm font-medium shadow-xs transition-all hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
        >
          {createMutation.isPending ? 'Criando...' : 'Criar'}
        </button>
      </footer>
    </aside>
  );
}
