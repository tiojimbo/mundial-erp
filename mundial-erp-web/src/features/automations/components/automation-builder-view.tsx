'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  RiArrowLeftLine,
  RiArrowRightLine,
  RiCloseLine,
  RiDeleteBinLine,
  RiFlashlightLine,
  RiSettings4Line,
} from '@remixicon/react';
import * as Dialog from '@radix-ui/react-dialog';
import { cn } from '@/lib/cn';
import { useCurrentWorkspace } from '@/features/workspaces/hooks/use-current-workspace';
import {
  useAutomationActions,
  useAutomationStatuses,
  useAutomationTriggers,
  useCreateAutomation,
  useUpdateAutomation,
} from '../hooks/use-automations';
import type {
  Automation,
  AutomationAction,
  CreateAutomationPayload,
} from '../types/automation.types';

type ParamType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'date'
  | 'enum'
  | 'reference'
  | 'json';

type ReferenceType =
  | 'user'
  | 'list'
  | 'workflow-status'
  | 'tag'
  | 'task-type'
  | 'custom-field'
  | 'channel';

type ActionParamDef = {
  name: string;
  type: ParamType;
  required: boolean;
  description?: string;
  enumValues?: string[];
  referenceType?: ReferenceType;
};

type ExtendedActionDef = {
  id: string;
  label: string;
  category?: string;
  params?: ActionParamDef[];
};

type DraftAction = {
  id: string;
  type: string;
  params: Record<string, unknown>;
};

export type AutomationBuilderViewProps = {
  editing?: Automation | null;
  onBack: () => void;
  onClose: () => void;
};

const fieldCls =
  'block h-9 w-full rounded-md border border-stroke-soft-200 bg-bg-white-0 px-3 text-paragraph-sm text-text-strong-950 focus:border-stroke-strong-950 focus:outline-none';

export function AutomationBuilderView({
  editing,
  onBack,
  onClose,
}: AutomationBuilderViewProps) {
  const workspace = useCurrentWorkspace();
  const triggers = useAutomationTriggers();
  const actionsQuery = useAutomationActions();
  const statuses = useAutomationStatuses();
  const createMutation = useCreateAutomation();
  const updateMutation = useUpdateAutomation();

  const actions = (actionsQuery.data ?? []) as ExtendedActionDef[];

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [trigger, setTrigger] = useState<string>('');
  const [draftActions, setDraftActions] = useState<DraftAction[]>([
    { id: crypto.randomUUID(), type: '', params: {} },
  ]);

  useEffect(() => {
    if (editing) {
      setName(editing.name);
      setDescription(editing.description ?? '');
      setTrigger(editing.trigger);
      setDraftActions(
        editing.compiledActions.map((a) => ({
          id: crypto.randomUUID(),
          type: a.type,
          params: a.params,
        })),
      );
    } else {
      setName('');
      setDescription('');
      setTrigger('');
      setDraftActions([{ id: crypto.randomUUID(), type: '', params: {} }]);
    }
  }, [editing]);

  const triggersByCategory = useMemo(() => {
    const data = triggers.data ?? [];
    const map = new Map<string, typeof data>();
    for (const t of data) {
      const arr = map.get(t.category) ?? [];
      arr.push(t);
      map.set(t.category, arr);
    }
    return [...map.entries()];
  }, [triggers.data]);

  const allStatuses = useMemo(() => {
    if (!statuses.data) return [];
    return [
      ...statuses.data.spaces.flatMap((s) =>
        s.statuses.map((st) => ({
          id: st.id,
          name: `${s.name} / ${st.name}`,
          color: st.color,
        })),
      ),
      ...statuses.data.folders.flatMap((f) =>
        f.statuses.map((st) => ({
          id: st.id,
          name: `${f.name} / ${st.name}`,
          color: st.color,
        })),
      ),
    ];
  }, [statuses.data]);

  const isValid = useMemo(() => {
    if (!trigger || !name.trim()) return false;
    return draftActions.every((a) => {
      if (!a.type) return false;
      const meta = actions.find((x) => x.id === a.type);
      if (!meta) return false;
      return (meta.params ?? [])
        .filter((p) => p.required)
        .every(
          (p) =>
            a.params[p.name] !== undefined &&
            a.params[p.name] !== '' &&
            a.params[p.name] !== null,
        );
    });
  }, [trigger, name, draftActions, actions]);

  const triggerLabel =
    (triggers.data ?? []).find((t) => t.id === trigger)?.label ?? '...';
  const firstActionLabel = draftActions[0]?.type
    ? actions.find((a) => a.id === draftActions[0].type)?.label ?? '...'
    : '...';

  const addAction = () =>
    setDraftActions((prev) => [
      ...prev,
      { id: crypto.randomUUID(), type: '', params: {} },
    ]);

  const removeAction = (id: string) =>
    setDraftActions((prev) => prev.filter((a) => a.id !== id));

  const setActionType = (id: string, type: string) =>
    setDraftActions((prev) =>
      prev.map((a) => (a.id === id ? { ...a, type, params: {} } : a)),
    );

  const setActionParam = (id: string, paramName: string, value: unknown) =>
    setDraftActions((prev) =>
      prev.map((a) =>
        a.id === id ? { ...a, params: { ...a.params, [paramName]: value } } : a,
      ),
    );

  const handleSave = () => {
    if (!isValid) return;
    const payload: CreateAutomationPayload = {
      name: name.trim(),
      description: description.trim() || undefined,
      trigger,
      compiledActions: draftActions.map<AutomationAction>((a) => ({
        type: a.type,
        params: a.params,
      })),
      scopeType: 'WORKSPACE',
      isActive: editing?.isActive ?? true,
    };

    if (editing) {
      updateMutation.mutate(
        { id: editing.id, payload },
        { onSuccess: onBack },
      );
    } else {
      createMutation.mutate(payload, { onSuccess: onBack });
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;
  const workspaceLabel = workspace?.name ?? 'Workspace';
  const workspaceInitial = workspaceLabel[0]?.toUpperCase() ?? 'W';

  return (
    <>
      {/* Header */}
      <div className='flex shrink-0 items-start gap-3 border-b border-stroke-soft-200 px-6 py-4'>
        <button
          type='button'
          onClick={onBack}
          aria-label='Voltar'
          className='mt-0.5 rounded-md p-1 text-text-sub-600 transition-colors hover:bg-bg-weak-50 hover:text-text-strong-950'
        >
          <RiArrowLeftLine className='size-4' />
        </button>
        <div className='min-w-0 flex-1'>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder='Dê um nome à automação...'
            className='block w-full border-none bg-transparent p-0 text-label-sm text-text-strong-950 placeholder:text-text-soft-400 focus:outline-none'
          />
          <p className='mt-0.5 flex items-center gap-1.5 text-paragraph-xs text-text-sub-600'>
            <span>Em</span>
            <span className='inline-flex size-3.5 items-center justify-center rounded bg-primary-base text-[8px] font-bold text-static-white'>
              {workspaceInitial}
            </span>
            <span>{workspaceLabel}</span>
          </p>
        </div>
        <Dialog.Close asChild>
          <button
            type='button'
            onClick={onClose}
            aria-label='Fechar'
            className='rounded-md p-1 text-text-sub-600 transition-colors hover:bg-bg-weak-50 hover:text-text-strong-950'
          >
            <RiCloseLine className='size-4' />
          </button>
        </Dialog.Close>
      </div>

      {/* Body */}
      <div className='flex min-h-0 flex-1 overflow-auto'>
        <div className='mx-auto flex w-full max-w-[820px] items-start gap-0 px-6 py-8'>
          {/* Trigger column */}
          <div className='flex-1 space-y-0'>
            <div className='flex items-center justify-between rounded-t-lg bg-bg-weak-50 px-4 py-3'>
              <div className='flex items-center gap-2'>
                <RiFlashlightLine className='size-4 fill-[#ffb900] text-[#ffb900]' />
                <span className='text-label-sm text-text-strong-950'>
                  Gatilho
                </span>
              </div>
            </div>
            <div className='space-y-3 rounded-b-lg border border-t-0 border-stroke-soft-200 px-4 py-4'>
              <select
                value={trigger}
                onChange={(e) => setTrigger(e.target.value)}
                className={fieldCls}
              >
                <option value=''>Selecione um gatilho...</option>
                {triggersByCategory.map(([category, items]) => (
                  <optgroup key={category} label={category.toUpperCase()}>
                    {items.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.label}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
          </div>

          {/* Arrow */}
          <div className='flex shrink-0 items-center px-4 pt-3'>
            <RiArrowRightLine className='size-5 text-text-sub-600' />
          </div>

          {/* Actions column */}
          <div className='flex-1 space-y-0'>
            <div className='flex items-center gap-2 rounded-lg bg-bg-weak-50 px-4 py-3'>
              <RiSettings4Line className='size-4 text-information-base' />
              <span className='text-label-sm text-text-strong-950'>Ações</span>
            </div>

            {draftActions.map((da) => (
              <div key={da.id} className='relative mt-3'>
                <ActionCard
                  draft={da}
                  catalog={actions}
                  statuses={allStatuses}
                  canRemove={draftActions.length > 1}
                  onTypeChange={(t) => setActionType(da.id, t)}
                  onParamChange={(p, v) => setActionParam(da.id, p, v)}
                  onRemove={() => removeAction(da.id)}
                />
              </div>
            ))}

            <div className='flex justify-center pt-3'>
              <button
                type='button'
                onClick={addAction}
                aria-label='Adicionar ação'
                className='flex size-7 items-center justify-center rounded-full border border-stroke-soft-200 text-text-sub-600 transition-colors hover:border-stroke-strong-950 hover:bg-bg-weak-50'
              >
                <span className='text-lg leading-none'>+</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className='shrink-0 border-t border-stroke-soft-200'>
        <div className='flex flex-col items-center gap-1 px-6 py-3'>
          <div className='flex items-center gap-2 text-paragraph-sm'>
            <span className='text-text-sub-600'>Quando</span>
            <span className='rounded border border-stroke-soft-200 px-2 py-0.5 text-paragraph-xs text-text-sub-600'>
              {triggerLabel}
            </span>
            <span className='text-text-sub-600'>então</span>
            <span className='rounded border border-stroke-soft-200 px-2 py-0.5 text-paragraph-xs text-text-sub-600'>
              {firstActionLabel}
              {draftActions.length > 1 && ` +${draftActions.length - 1}`}
            </span>
          </div>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder='Adicione uma descrição...'
            className='block h-auto w-full border-none bg-transparent p-0 text-center text-paragraph-xs text-text-sub-600 placeholder:text-text-soft-400 focus:outline-none'
          />
        </div>
        <div className='flex items-center justify-end gap-2 border-t border-stroke-soft-200 px-6 py-3'>
          <button
            type='button'
            onClick={onBack}
            className='inline-flex h-8 items-center rounded-md px-3 text-paragraph-sm text-text-sub-600 hover:bg-bg-weak-50 hover:text-text-strong-950'
          >
            Cancelar
          </button>
          <button
            type='button'
            disabled={!isValid || isPending}
            onClick={handleSave}
            className={cn(
              'inline-flex h-8 items-center rounded-md px-3 text-paragraph-sm text-static-white',
              isValid && !isPending
                ? 'bg-primary-base hover:opacity-90'
                : 'cursor-not-allowed bg-bg-soft-200',
            )}
          >
            {isPending ? 'Salvando...' : editing ? 'Salvar' : 'Criar'}
          </button>
        </div>
      </div>
    </>
  );
}

function ActionCard({
  draft,
  catalog,
  statuses,
  canRemove,
  onTypeChange,
  onParamChange,
  onRemove,
}: {
  draft: DraftAction;
  catalog: ExtendedActionDef[];
  statuses: Array<{ id: string; name: string; color: string | null }>;
  canRemove: boolean;
  onTypeChange: (type: string) => void;
  onParamChange: (paramName: string, value: unknown) => void;
  onRemove: () => void;
}) {
  const meta = catalog.find((a) => a.id === draft.type);

  return (
    <div className='space-y-3 rounded-lg border border-stroke-soft-200 px-4 py-4'>
      <div className='flex items-center gap-2'>
        <select
          value={draft.type}
          onChange={(e) => onTypeChange(e.target.value)}
          className={cn(fieldCls, 'flex-1')}
        >
          <option value=''>Selecione uma ação...</option>
          {catalog.map((a) => (
            <option key={a.id} value={a.id}>
              {a.label}
            </option>
          ))}
        </select>
        {canRemove && (
          <button
            type='button'
            onClick={onRemove}
            aria-label='Remover ação'
            className='rounded-md p-1.5 text-text-sub-600 hover:bg-bg-weak-50 hover:text-error-base'
          >
            <RiDeleteBinLine className='size-3.5' />
          </button>
        )}
      </div>

      {meta && meta.params && meta.params.length > 0 && (
        <div className='space-y-2'>
          {meta.params.map((param) => (
            <ParamField
              key={param.name}
              param={param}
              value={draft.params[param.name]}
              onChange={(v) => onParamChange(param.name, v)}
              statuses={statuses}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ParamField({
  param,
  value,
  onChange,
  statuses,
}: {
  param: ActionParamDef;
  value: unknown;
  onChange: (v: unknown) => void;
  statuses: Array<{ id: string; name: string; color: string | null }>;
}) {
  const label = humanize(param.name);

  return (
    <div>
      <p className='mb-1 text-paragraph-xs text-text-sub-600'>
        {label}
        {param.required && ' *'}
      </p>
      {renderField()}
    </div>
  );

  function renderField() {
    if (param.type === 'enum') {
      return (
        <select
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value)}
          className={fieldCls}
        >
          <option value=''>Selecione...</option>
          {(param.enumValues ?? []).map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
      );
    }

    if (param.type === 'reference' && param.referenceType === 'workflow-status') {
      return (
        <select
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value)}
          className={fieldCls}
        >
          <option value=''>Selecione um status...</option>
          {statuses.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      );
    }

    if (param.type === 'reference') {
      return (
        <input
          type='text'
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={`${param.referenceType ?? 'id'} (UUID)`}
          className={cn(fieldCls, 'font-mono text-paragraph-xs')}
        />
      );
    }

    if (param.type === 'boolean') {
      return (
        <label className='inline-flex cursor-pointer items-center gap-2'>
          <input
            type='checkbox'
            checked={Boolean(value)}
            onChange={(e) => onChange(e.target.checked)}
            className='size-4 rounded border-stroke-soft-200'
          />
          <span className='text-paragraph-xs text-text-sub-600'>
            {value ? 'Sim' : 'Não'}
          </span>
        </label>
      );
    }

    if (param.type === 'number') {
      return (
        <input
          type='number'
          value={(value as number | undefined) ?? ''}
          onChange={(e) =>
            onChange(e.target.value === '' ? '' : Number(e.target.value))
          }
          className={fieldCls}
        />
      );
    }

    if (param.type === 'date') {
      return (
        <input
          type='date'
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value)}
          className={fieldCls}
        />
      );
    }

    if (param.type === 'json') {
      return (
        <input
          type='text'
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder='{"key": "value"}'
          className={cn(fieldCls, 'font-mono text-paragraph-xs')}
        />
      );
    }

    return (
      <input
        type='text'
        value={(value as string) ?? ''}
        onChange={(e) => onChange(e.target.value)}
        className={fieldCls}
      />
    );
  }
}

function humanize(name: string) {
  return (
    name.charAt(0).toUpperCase() +
    name
      .slice(1)
      .replace(/([A-Z])/g, ' $1')
      .replace(/[_-]/g, ' ')
  );
}
