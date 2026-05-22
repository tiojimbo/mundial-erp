'use client';

import { useEffect, useMemo, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  AtSign,
  Calendar,
  CheckSquare,
  ChevronDown,
  CircleDollarSign,
  Clock,
  FileDigit,
  Hash,
  LayoutGrid,
  Link as LinkIcon,
  Link2,
  Percent,
  Phone,
  Plus,
  Scale,
  Settings2,
  Sigma,
  Star,
  Tag,
  Type,
  User as UserIcon,
  Users,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

import * as Modal from '@/components/ui/modal';
import { CustomFieldsManagerDialog } from '@/features/custom-fields/components/manager/custom-fields-manager-dialog';
import {
  useCreateCustomField,
  useCustomFieldDefinitions,
} from '@/features/custom-fields/hooks/use-custom-field-definitions';
import {
  useClearCustomFieldValue,
  useCustomFieldValues,
  usePatchCustomFieldValue,
} from '@/features/custom-fields/hooks/use-custom-field-values';
import { useCnpjAutofill } from '@/features/custom-fields/hooks/use-cnpj-autofill';
import { useFeatureFlag } from '@/features/custom-fields/hooks/use-feature-flag';
import type {
  CustomFieldDefinition,
  CustomFieldRawValue,
  CustomFieldType,
  CustomFieldValue,
} from '@/features/custom-fields/types/custom-field.types';
import { CnpjField } from '@/features/custom-fields/components/fields/cnpj-field';
import { CpfField } from '@/features/custom-fields/components/fields/cpf-field';
import { CurrencyField } from '@/features/custom-fields/components/fields/currency-field';
import { DateField } from '@/features/custom-fields/components/fields/date-field';
import { DropdownField } from '@/features/custom-fields/components/fields/dropdown-field';
import { EmailField } from '@/features/custom-fields/components/fields/email-field';
import { NumberField } from '@/features/custom-fields/components/fields/number-field';
import { PhoneField } from '@/features/custom-fields/components/fields/phone-field';
import { QuantityField } from '@/features/custom-fields/components/fields/quantity-field';
import { TextField } from '@/features/custom-fields/components/fields/text-field';
import { UrlField } from '@/features/custom-fields/components/fields/url-field';
import { CheckboxField } from '@/features/custom-fields/components/fields/checkbox-field';
import { SelectField } from '@/features/custom-fields/components/fields/select-field';
import { LabelField } from '@/features/custom-fields/components/fields/label-field';
import { RatingField } from '@/features/custom-fields/components/fields/rating-field';
import { PercentageField } from '@/features/custom-fields/components/fields/percentage-field';
import { DurationField } from '@/features/custom-fields/components/fields/duration-field';
import { UserField } from '@/features/custom-fields/components/fields/user-field';
import { TeamField } from '@/features/custom-fields/components/fields/team-field';
import { PeopleField } from '@/features/custom-fields/components/fields/people-field';
import { RelationshipField } from '@/features/custom-fields/components/fields/relationship-field';
import { RollupField } from '@/features/custom-fields/components/fields/rollup-field';

import { CollapsibleSection } from './collapsible-section';
import { EmptyCardCta } from './empty-card-cta';

/**
 * Sprint 4 (TTT-041) — Integracao de Custom Fields na Task View.
 *
 * Contrato de exibicao (PLANO-TASK-TYPES-TEMPLATES §"Integracao Task View"):
 *
 *   - `definitionIds == null`     → secao mostra TODAS definitions visiveis
 *                                    ao workspace (task sem customType ou
 *                                    customType sem template).
 *   - `definitionIds == []`       → secao mostra placeholder vazio (template
 *                                    existe mas nao referencia campos).
 *   - `definitionIds == [...ids]` → ordena/filtra exatamente pelos ids do
 *                                    template, na ordem fornecida.
 *
 * Read-only enquanto a flag `custom_fields_write` (M1) estiver OFF — vide
 * `useFeatureFlag` (TTT-023). O dispatcher repassa `readOnly` para cada
 * editor; nenhum PATCH e disparado.
 *
 * NAO toca em `features/custom-fields/` (modulo de Henrique). Apenas consome
 * hooks/types/components ja exportados por aquele modulo.
 */

export type CustomFieldsSectionProps = {
  taskId: string;
  /**
   * Quando fornecido pelo template do CustomTaskType (TTT-031), restringe os
   * campos exibidos a esses `definitionId`s na ordem indicada. `null`/`undefined`
   * = sem template => exibir todas as definitions do workspace.
   */
  definitionIds?: readonly string[] | null;
  /**
   * `processId` da task (= listId no dominio Hoppe). Quando presente, o botao
   * "Criar campo" inline cria o campo escopado a esta lista; senao, omite o
   * atalho (usuario abre o gerenciador completo).
   */
  listId?: string | null;
  /**
   * Nome do task type da task (ex: "Nota Fiscal"). Usado no label do subgrupo
   * `taskType` ("Campos do tipo Nota Fiscal") pra paridade com Hoppe.
   */
  taskTypeName?: string | null;
  /**
   * `customTaskTypeId` da task. Usado pra filtrar custom fields escopados
   * a este task type (paridade Hoppe: GET /custom-fields?taskTypeId=...).
   */
  taskTypeId?: string | null;
};

const QUICK_TYPE_OPTIONS: ReadonlyArray<{
  value: CustomFieldType;
  label: string;
}> = [
  { value: 'TEXT', label: 'Texto' },
  { value: 'NUMBER', label: 'Número' },
  { value: 'QUANTITY', label: 'Quantidade' },
  { value: 'CURRENCY', label: 'Moeda' },
  { value: 'DATE', label: 'Data' },
  { value: 'DROPDOWN', label: 'Lista suspensa' },
  { value: 'CHECKBOX', label: 'Caixa de seleção' },
  { value: 'URL', label: 'URL' },
  { value: 'EMAIL', label: 'E-mail' },
  { value: 'PHONE', label: 'Telefone' },
  { value: 'PERCENTAGE', label: 'Porcentagem' },
  { value: 'DURATION', label: 'Duração' },
  { value: 'RATING', label: 'Avaliação' },
  { value: 'PEOPLE', label: 'Pessoas' },
  { value: 'RELATIONSHIP', label: 'Relacionamento' },
  { value: 'LABEL', label: 'Etiqueta' },
  { value: 'SELECT', label: 'Seleção' },
  { value: 'CPF', label: 'CPF' },
  { value: 'CNPJ', label: 'CNPJ' },
];

type BucketKey = 'taskType' | 'list' | 'folder' | 'space' | 'workspace';

const BUCKET_ORDER: BucketKey[] = [
  'taskType',
  'list',
  'folder',
  'space',
  'workspace',
];

const BUCKET_LABEL: Record<BucketKey, string> = {
  taskType: 'Campos do tipo',
  list: 'Campos desta lista',
  folder: 'Herdados da pasta',
  space: 'Herdados do departamento',
  workspace: 'Campos do workspace',
};

const TYPE_ICON: Partial<Record<CustomFieldType, LucideIcon>> = {
  TEXT: Type,
  NUMBER: Hash,
  QUANTITY: Scale,
  CURRENCY: CircleDollarSign,
  DATE: Calendar,
  DROPDOWN: ChevronDown,
  SELECT: ChevronDown,
  URL: LinkIcon,
  EMAIL: AtSign,
  PHONE: Phone,
  CPF: FileDigit,
  CNPJ: FileDigit,
  CHECKBOX: CheckSquare,
  LABEL: Tag,
  RATING: Star,
  PERCENTAGE: Percent,
  DURATION: Clock,
  USER: UserIcon,
  TEAM: Users,
  PEOPLE: Users,
  RELATIONSHIP: Link2,
  ROLLUP: Sigma,
};

export function CustomFieldsSection({
  taskId,
  definitionIds,
  listId,
  taskTypeName,
  taskTypeId,
}: CustomFieldsSectionProps) {
  const writeEnabled = useFeatureFlag('custom_fields_write');

  const definitionsScope = useMemo(() => {
    const scope: { listId?: string; taskTypeId?: string } = {};
    if (listId) scope.listId = listId;
    if (taskTypeId) scope.taskTypeId = taskTypeId;
    return Object.keys(scope).length > 0 ? scope : undefined;
  }, [listId, taskTypeId]);
  const definitionsQuery = useCustomFieldDefinitions(definitionsScope);
  const valuesQuery = useCustomFieldValues(taskId);
  const patchMutation = usePatchCustomFieldValue();
  const clearMutation = useClearCustomFieldValue();
  const triggerCnpjAutofill = useCnpjAutofill(taskId);

  const isLoading = definitionsQuery.isLoading || valuesQuery.isLoading;
  const isError = definitionsQuery.isError || valuesQuery.isError;

  const bucketGroups = useMemo(() => {
    const grouped = definitionsQuery.data;
    if (!grouped)
      return [] as {
        key: BucketKey;
        label: string;
        defs: CustomFieldDefinition[];
      }[];
    const seen = new Set<string>();
    const out: {
      key: BucketKey;
      label: string;
      defs: CustomFieldDefinition[];
    }[] = [];
    for (const key of BUCKET_ORDER) {
      const raw = (grouped[key] ?? []) as CustomFieldDefinition[];
      const dedup = raw.filter((def) => {
        if (seen.has(def.id)) return false;
        seen.add(def.id);
        return true;
      });
      if (dedup.length === 0) continue;
      out.push({
        key,
        label:
          key === 'taskType' && taskTypeName
            ? `Campos do tipo ${taskTypeName}`
            : BUCKET_LABEL[key],
        defs: dedup.sort(
          (a, b) => a.position - b.position || a.name.localeCompare(b.name),
        ),
      });
    }
    return out;
  }, [definitionsQuery.data, taskTypeName]);

  const visibleGroups = useMemo(() => {
    if (!definitionIds) return bucketGroups;
    if (definitionIds.length === 0) return [];
    const order = new Map(definitionIds.map((id, i) => [id, i]));
    return bucketGroups
      .map((g) => ({
        ...g,
        defs: g.defs
          .filter((d) => order.has(d.id))
          .sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0)),
      }))
      .filter((g) => g.defs.length > 0);
  }, [bucketGroups, definitionIds]);

  const allVisible = useMemo(
    () => visibleGroups.flatMap((g) => g.defs),
    [visibleGroups],
  );

  const valueMap = useMemo(() => {
    const map = new Map<string, CustomFieldValue>();
    for (const entry of valuesQuery.data ?? []) {
      map.set(entry.customFieldId, entry);
    }
    return map;
  }, [valuesQuery.data]);

  const [managerOpen, setManagerOpen] = useState(false);
  const [managerInitDefId, setManagerInitDefId] = useState<string | null>(null);
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);
  const openSettings = (definitionId: string) => {
    setManagerInitDefId(definitionId);
    setManagerOpen(true);
  };
  const handleManagerClose = () => {
    setManagerOpen(false);
    setManagerInitDefId(null);
  };

  function handleChange(customFieldId: string, next: CustomFieldRawValue) {
    if (!writeEnabled) return;
    const isEmpty =
      next === null ||
      next === undefined ||
      next === '' ||
      (Array.isArray(next) && next.length === 0);
    if (isEmpty) {
      clearMutation.mutate({ taskId, customFieldId });
    } else {
      patchMutation.mutate({ taskId, customFieldId, value: next });
    }
    const def = allVisible.find((d) => d.id === customFieldId);
    if (def) triggerCnpjAutofill(def, next);
  }

  return (
    <CollapsibleSection
      sectionKey='custom-fields'
      title='Campos personalizados'
      counter={
        allVisible.length > 0 ? (
          <span className='rounded-full bg-muted px-1.5 py-0.5 text-[10px] tabular-nums leading-none text-muted-foreground'>
            {allVisible.length}
          </span>
        ) : null
      }
      actions={
        <>
          {writeEnabled && listId ? (
            <button
              type='button'
              aria-label='Criar campo personalizado nesta lista'
              onClick={() => setQuickCreateOpen(true)}
              className='flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-all hover:bg-muted focus-visible:opacity-100 group-hover:opacity-100'
            >
              <Plus className='h-3.5 w-3.5' />
            </button>
          ) : null}
          <button
            type='button'
            aria-label='Gerenciar campos personalizados desta lista'
            onClick={() => setManagerOpen(true)}
            className='flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-all hover:bg-muted focus-visible:opacity-100 group-hover:opacity-100'
          >
            <Settings2 className='h-3.5 w-3.5' />
          </button>
        </>
      }
    >
      {isLoading && (
        <div
          aria-busy='true'
          aria-label='Carregando campos personalizados'
          className='flex flex-col gap-2'
        >
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className='h-9 w-full animate-pulse rounded-md bg-muted'
            />
          ))}
        </div>
      )}

      {!isLoading && isError && (
        <div role='alert' className='text-[12px] text-destructive'>
          Nao foi possivel carregar os campos personalizados.
        </div>
      )}

      {!isLoading && !isError && allVisible.length === 0 && (
        <EmptyCardCta label='Criar campo personalizado' />
      )}

      {!isLoading && !isError && allVisible.length > 0 && (
        <div className='flex flex-col gap-4'>
          {visibleGroups.map((group) => (
            <FieldSubgroup
              key={group.key}
              subKey={group.key}
              label={group.label}
              defs={group.defs}
              valueMap={valueMap}
              readOnly={!writeEnabled}
              onChange={handleChange}
              onOpenSettings={openSettings}
            />
          ))}
        </div>
      )}
      <CustomFieldsManagerDialog
        open={managerOpen}
        onClose={handleManagerClose}
        initialSelectedDefId={managerInitDefId}
      />
      {listId ? (
        <QuickCreateFieldDialog
          open={quickCreateOpen}
          onClose={() => setQuickCreateOpen(false)}
          listId={listId}
        />
      ) : null}
    </CollapsibleSection>
  );
}

type FieldSubgroupProps = {
  subKey: string;
  label: string;
  defs: CustomFieldDefinition[];
  valueMap: Map<string, CustomFieldValue>;
  readOnly: boolean;
  onChange: (customFieldId: string, next: CustomFieldRawValue) => void;
  onOpenSettings: (definitionId: string) => void;
};

function FieldSubgroup({
  label,
  defs,
  valueMap,
  readOnly,
  onChange,
  onOpenSettings,
}: FieldSubgroupProps) {
  return (
    <div className='relative'>
      <div className='pb-1'>
        <div className='mb-1 flex items-center gap-1.5 px-1 pt-1'>
          <LayoutGrid
            className='text-muted-foreground/40 h-3 w-3'
            aria-hidden='true'
          />
          <span className='text-muted-foreground/50 text-[10px] font-semibold uppercase tracking-widest'>
            {label}
          </span>
        </div>
        <div>
          {defs.map((definition) => {
            const Icon = TYPE_ICON[definition.type] ?? Hash;
            return (
              <div
                key={definition.id}
                className='group/row border-border/40 hover:bg-accent/30 -mb-px flex min-h-[34px] items-center border-y transition-colors'
              >
                <div
                  className='flex items-center gap-2 pl-2 pr-2'
                  style={{ width: 220, minWidth: 220 }}
                >
                  <Icon
                    className='text-muted-foreground/60 h-3.5 w-3.5 shrink-0'
                    aria-hidden='true'
                  />
                  <span className='truncate text-[13px] normal-case text-muted-foreground'>
                    {definition.name}
                  </span>
                  <button
                    type='button'
                    aria-label={`Configurações do campo ${definition.name}`}
                    onClick={() => onOpenSettings(definition.id)}
                    className='text-muted-foreground/40 ml-auto flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded opacity-0 transition-opacity hover:bg-accent focus-visible:opacity-100 group-hover/row:opacity-100'
                  >
                    <Settings2 className='h-3 w-3' />
                  </button>
                </div>
                <div className='flex min-w-0 flex-1 items-center px-3 py-1'>
                  <FieldRow
                    definition={definition}
                    entry={valueMap.get(definition.id) ?? null}
                    readOnly={readOnly}
                    onChange={(next) => onChange(definition.id, next)}
                    inline
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

type FieldRowProps = {
  definition: CustomFieldDefinition;
  entry: CustomFieldValue | null;
  readOnly: boolean;
  onChange: (next: CustomFieldRawValue) => void;
  inline?: boolean;
};

/**
 * Dispatcher local: roteia para o editor correto conforme `definition.type`.
 *
 * Nao depende de um dispatcher exportado por `features/custom-fields/`
 * (Henrique nao publicou ainda) — usa direto os componentes atomicos
 * `<TextField/>`, `<DropdownField/>`, etc., que ja estao prontos.
 */
function FieldRow({
  definition,
  entry,
  readOnly,
  onChange,
  inline,
}: FieldRowProps) {
  const rawValue = entry?.value ?? null;
  const value: string | number | null =
    typeof rawValue === 'string' || typeof rawValue === 'number'
      ? rawValue
      : null;
  const boolValue: boolean | null =
    typeof rawValue === 'boolean'
      ? rawValue
      : rawValue === 'true'
        ? true
        : rawValue === 'false'
          ? false
          : null;
  const arrayValue: string[] | null = Array.isArray(rawValue)
    ? rawValue.filter((v): v is string => typeof v === 'string')
    : null;
  const numberValue: number | null =
    typeof rawValue === 'number' ? rawValue : null;

  switch (definition.type) {
    case 'TEXT':
      return (
        <TextField
          definition={definition}
          value={value}
          readOnly={readOnly}
          onChange={onChange}
          inline={inline}
        />
      );
    case 'NUMBER':
      return (
        <NumberField
          definition={definition}
          value={value}
          readOnly={readOnly}
          onChange={onChange}
          inline={inline}
        />
      );
    case 'CURRENCY':
      return (
        <CurrencyField
          definition={definition}
          value={value}
          readOnly={readOnly}
          onChange={onChange}
          inline={inline}
        />
      );
    case 'QUANTITY':
      return (
        <QuantityField
          definition={definition}
          value={value}
          readOnly={readOnly}
          onChange={onChange}
          inline={inline}
        />
      );
    case 'DATE':
      return (
        <DateField
          definition={definition}
          value={value === null ? null : String(value)}
          readOnly={readOnly}
          onChange={onChange}
          inline={inline}
        />
      );
    case 'DROPDOWN':
      return (
        <DropdownField
          definition={definition}
          value={value === null ? null : String(value)}
          readOnly={readOnly}
          onChange={onChange}
          inline={inline}
        />
      );
    case 'CPF':
      return (
        <CpfField
          definition={definition}
          value={value === null ? null : String(value)}
          readOnly={readOnly}
          onChange={onChange}
          inline={inline}
        />
      );
    case 'CNPJ':
      return (
        <CnpjField
          definition={definition}
          value={value === null ? null : String(value)}
          readOnly={readOnly}
          onChange={onChange}
          inline={inline}
        />
      );
    case 'URL':
      return (
        <UrlField
          definition={definition}
          value={value === null ? null : String(value)}
          readOnly={readOnly}
          onChange={onChange}
          inline={inline}
        />
      );
    case 'EMAIL':
      return (
        <EmailField
          definition={definition}
          value={value === null ? null : String(value)}
          readOnly={readOnly}
          onChange={onChange}
          inline={inline}
        />
      );
    case 'PHONE':
      return (
        <PhoneField
          definition={definition}
          value={value === null ? null : String(value)}
          readOnly={readOnly}
          onChange={onChange}
          inline={inline}
        />
      );
    case 'CHECKBOX':
      return (
        <CheckboxField
          definition={definition}
          value={boolValue}
          readOnly={readOnly}
          onChange={onChange}
          inline={inline}
        />
      );
    case 'SELECT':
      return (
        <SelectField
          definition={definition}
          value={value === null ? null : String(value)}
          readOnly={readOnly}
          onChange={onChange}
          inline={inline}
        />
      );
    case 'LABEL':
      return (
        <LabelField
          definition={definition}
          value={value === null ? null : String(value)}
          readOnly={readOnly}
          onChange={onChange}
          inline={inline}
        />
      );
    case 'RATING':
      return (
        <RatingField
          definition={definition}
          value={numberValue}
          readOnly={readOnly}
          onChange={onChange}
          inline={inline}
        />
      );
    case 'PERCENTAGE':
      return (
        <PercentageField
          definition={definition}
          value={numberValue}
          readOnly={readOnly}
          onChange={onChange}
          inline={inline}
        />
      );
    case 'DURATION':
      return (
        <DurationField
          definition={definition}
          value={numberValue}
          readOnly={readOnly}
          onChange={onChange}
          inline={inline}
        />
      );
    case 'USER':
      return (
        <UserField
          definition={definition}
          value={value === null ? null : String(value)}
          readOnly={readOnly}
          onChange={onChange}
          inline={inline}
        />
      );
    case 'TEAM':
      return (
        <TeamField
          definition={definition}
          value={value === null ? null : String(value)}
          readOnly={readOnly}
          onChange={onChange}
          inline={inline}
        />
      );
    case 'PEOPLE':
      return (
        <PeopleField
          definition={definition}
          value={arrayValue}
          readOnly={readOnly}
          onChange={onChange}
          inline={inline}
        />
      );
    case 'RELATIONSHIP':
      return (
        <RelationshipField
          definition={definition}
          value={arrayValue}
          readOnly={readOnly}
          onChange={onChange}
          inline={inline}
        />
      );
    case 'ROLLUP':
      return (
        <RollupField
          definition={definition}
          value={value}
          readOnly={readOnly}
          onChange={onChange}
          inline={inline}
        />
      );
    default:
      return null;
  }
}

type QuickCreateFieldDialogProps = {
  open: boolean;
  onClose: () => void;
  listId: string;
};

function QuickCreateFieldDialog({
  open,
  onClose,
  listId,
}: QuickCreateFieldDialogProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState<CustomFieldType>('TEXT');
  const [label, setLabel] = useState('');
  const [description, setDescription] = useState('');
  const [required, setRequired] = useState(false);
  const createMutation = useCreateCustomField();

  useEffect(() => {
    if (open) {
      setName('');
      setType('TEXT');
      setLabel('');
      setDescription('');
      setRequired(false);
      createMutation.reset();
    }
  }, [open, createMutation]);

  const submit = () => {
    const trimmed = name.trim();
    if (trimmed.length === 0) return;
    createMutation.mutate(
      {
        name: trimmed,
        label: label.trim() || trimmed,
        type,
        required,
        pinned: false,
        visibleToGuests: true,
        description: description.trim() || undefined,
        listId,
      },
      {
        onSuccess: () => {
          toast.success('Campo criado.');
          onClose();
        },
        onError: () =>
          toast.error('Erro ao criar — confira nome, tipo e escopo.'),
      },
    );
  };

  return (
    <Modal.Root open={open} onOpenChange={(next) => !next && onClose()}>
      <Modal.Content
        showClose={false}
        overlayClassName='bg-black/60 backdrop-blur-none'
        className='flex max-h-[90vh] !max-w-[420px] flex-col overflow-hidden !rounded-xl border-0 p-0 !shadow-regular-md'
      >
        <Modal.Title className='sr-only'>Criar campo personalizado</Modal.Title>
        <header className='flex shrink-0 items-center justify-between border-b border-border px-4 py-3'>
          <div className='flex flex-col'>
            <span className='text-label-sm'>Criar campo</span>
            <span className='text-paragraph-xs text-muted-foreground'>
              Crie um novo campo personalizado nesta lista
            </span>
          </div>
          <button
            type='button'
            aria-label='Fechar'
            onClick={onClose}
            className='inline-flex size-7 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent'
          >
            <X className='h-4 w-4' />
          </button>
        </header>

        <div className='flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-5'>
          <div>
            <label className='text-foreground/80 mb-1.5 block text-paragraph-sm font-medium'>
              Nome <span className='text-destructive'>*</span>
            </label>
            <input
              type='text'
              value={name}
              autoFocus
              onChange={(e) => setName(e.target.value)}
              placeholder='Digite o nome do campo'
              className='focus-visible:ring-ring/50 h-9 w-full rounded-md border border-input bg-transparent px-3 text-paragraph-sm outline-none focus-visible:ring-[3px]'
            />
          </div>

          <div>
            <label className='text-foreground/80 mb-1.5 block text-paragraph-sm font-medium'>
              Tipo
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as CustomFieldType)}
              className='focus-visible:ring-ring/50 h-9 w-full cursor-pointer rounded-md border border-input bg-transparent px-3 text-paragraph-sm outline-none focus-visible:ring-[3px]'
            >
              {QUICK_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className='text-foreground/80 mb-1.5 block text-paragraph-sm font-medium'>
              Label
            </label>
            <input
              type='text'
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder='Opcional — assume o nome se vazio'
              className='focus-visible:ring-ring/50 h-9 w-full rounded-md border border-input bg-transparent px-3 text-paragraph-sm outline-none focus-visible:ring-[3px]'
            />
          </div>

          <div>
            <label className='text-foreground/80 mb-1.5 block text-paragraph-sm font-medium'>
              Descrição
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder='Opcional'
              className='focus-visible:ring-ring/50 min-h-[60px] w-full resize-none rounded-md border border-input bg-transparent px-3 py-2 text-paragraph-sm outline-none focus-visible:ring-[3px]'
            />
          </div>

          <label className='flex cursor-pointer items-center gap-2 text-paragraph-sm'>
            <input
              type='checkbox'
              checked={required}
              onChange={(e) => setRequired(e.target.checked)}
              className='size-4 cursor-pointer rounded border-input'
            />
            Obrigatório nas tarefas
          </label>
        </div>

        <footer className='flex shrink-0 items-center justify-end gap-2 border-t border-border px-4 py-3'>
          <button
            type='button'
            onClick={onClose}
            className='inline-flex h-9 cursor-pointer items-center justify-center rounded-md border bg-background px-4 text-paragraph-sm font-medium shadow-regular-xs transition-all hover:bg-accent'
          >
            Cancelar
          </button>
          <button
            type='button'
            onClick={submit}
            disabled={name.trim().length === 0 || createMutation.isPending}
            className='inline-flex h-9 cursor-pointer items-center justify-center rounded-md bg-primary-base px-4 text-paragraph-sm font-medium text-static-white shadow-regular-xs transition-all hover:bg-primary-dark disabled:pointer-events-none disabled:opacity-50'
          >
            {createMutation.isPending ? 'Criando...' : 'Criar campo'}
          </button>
        </footer>
      </Modal.Content>
    </Modal.Root>
  );
}
