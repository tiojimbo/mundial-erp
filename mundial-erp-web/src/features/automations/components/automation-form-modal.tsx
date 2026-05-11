'use client';

import { useEffect, useState } from 'react';
import * as Modal from '@/components/ui/modal';
import { cn } from '@/lib/cn';
import {
  useAutomationActions,
  useAutomationTriggers,
  useCreateAutomation,
  useUpdateAutomation,
} from '../hooks/use-automations';
import {
  CONDITION_OPERATORS,
  SCOPE_TYPES,
  type Automation,
  type AutomationAction,
  type AutomationCondition,
  type AutomationScopeType,
  type ConditionOperator,
  type CreateAutomationPayload,
} from '../types/automation.types';

export type AutomationFormModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  automation?: Automation | null;
};

type FormState = {
  name: string;
  description: string;
  trigger: string;
  scopeType: AutomationScopeType;
  scopeId: string;
  conditions: AutomationCondition[];
  actions: AutomationAction[];
  isActive: boolean;
  cronExpression: string;
  timezone: string;
};

const EMPTY: FormState = {
  name: '',
  description: '',
  trigger: '',
  scopeType: 'WORKSPACE',
  scopeId: '',
  conditions: [],
  actions: [],
  isActive: true,
  cronExpression: '',
  timezone: 'America/Sao_Paulo',
};

function fromAutomation(a: Automation): FormState {
  return {
    name: a.name,
    description: a.description ?? '',
    trigger: a.trigger,
    scopeType: a.scopeType,
    scopeId: a.scopeId ?? '',
    conditions: a.conditions ?? [],
    actions: a.compiledActions ?? [],
    isActive: a.isActive,
    cronExpression: a.cronExpression ?? '',
    timezone: a.timezone ?? 'America/Sao_Paulo',
  };
}

export function AutomationFormModal({
  open,
  onOpenChange,
  automation,
}: AutomationFormModalProps) {
  const isEdit = Boolean(automation);
  const triggers = useAutomationTriggers();
  const actions = useAutomationActions();
  const createMutation = useCreateAutomation();
  const updateMutation = useUpdateAutomation();

  const [form, setForm] = useState<FormState>(EMPTY);

  useEffect(() => {
    if (!open) return;
    setForm(automation ? fromAutomation(automation) : EMPTY);
  }, [open, automation]);

  const isCron = form.trigger === 'CRON';
  const requiresScope = form.scopeType !== 'WORKSPACE';

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const addCondition = () =>
    update('conditions', [
      ...form.conditions,
      { field: '', operator: 'EQ', value: '' },
    ]);

  const updateCondition = (i: number, patch: Partial<AutomationCondition>) =>
    update(
      'conditions',
      form.conditions.map((c, idx) => (idx === i ? { ...c, ...patch } : c)),
    );

  const removeCondition = (i: number) =>
    update('conditions', form.conditions.filter((_, idx) => idx !== i));

  const addAction = () =>
    update('actions', [...form.actions, { type: '', params: {} }]);

  const updateAction = (i: number, patch: Partial<AutomationAction>) =>
    update(
      'actions',
      form.actions.map((a, idx) => (idx === i ? { ...a, ...patch } : a)),
    );

  const removeAction = (i: number) =>
    update('actions', form.actions.filter((_, idx) => idx !== i));

  const moveAction = (i: number, dir: -1 | 1) => {
    const target = i + dir;
    if (target < 0 || target >= form.actions.length) return;
    const next = [...form.actions];
    [next[i], next[target]] = [next[target], next[i]];
    update('actions', next);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.trigger || form.actions.length === 0) {
      return;
    }

    const payload: CreateAutomationPayload = {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      trigger: form.trigger,
      scopeType: form.scopeType,
      scopeId: requiresScope ? form.scopeId.trim() || undefined : undefined,
      compiledActions: form.actions,
      conditions: form.conditions,
      isActive: form.isActive,
      cronExpression: isCron ? form.cronExpression.trim() || undefined : undefined,
      timezone: isCron ? form.timezone || undefined : undefined,
    };

    if (isEdit && automation) {
      updateMutation.mutate(
        { id: automation.id, payload },
        { onSuccess: () => onOpenChange(false) },
      );
    } else {
      createMutation.mutate(payload, {
        onSuccess: () => onOpenChange(false),
      });
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Modal.Root open={open} onOpenChange={onOpenChange}>
      <Modal.Content className='max-w-3xl'>
        <Modal.Header
          title={isEdit ? 'Editar automação' : 'Nova automação'}
          description='Defina um gatilho, condições e ações para automatizar tarefas.'
        />
        <form
          onSubmit={handleSubmit}
          className='flex flex-col gap-4 max-h-[70vh] overflow-y-auto px-4 py-3'
        >
          <Field label='Nome'>
            <input
              type='text'
              value={form.name}
              onChange={(e) => update('name', e.target.value)}
              required
              minLength={2}
              maxLength={200}
              className={inputCls}
            />
          </Field>

          <Field label='Descrição'>
            <textarea
              value={form.description}
              onChange={(e) => update('description', e.target.value)}
              maxLength={500}
              rows={2}
              className={inputCls}
            />
          </Field>

          <Field label='Gatilho'>
            <select
              value={form.trigger}
              onChange={(e) => update('trigger', e.target.value)}
              required
              className={inputCls}
            >
              <option value=''>Selecione um gatilho</option>
              {(triggers.data ?? []).map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label} ({t.category})
                </option>
              ))}
            </select>
          </Field>

          {isCron && (
            <div className='grid grid-cols-2 gap-3'>
              <Field label='Cron expression'>
                <input
                  type='text'
                  value={form.cronExpression}
                  onChange={(e) => update('cronExpression', e.target.value)}
                  placeholder='0 9 * * 1-5'
                  className={inputCls}
                />
              </Field>
              <Field label='Timezone'>
                <input
                  type='text'
                  value={form.timezone}
                  onChange={(e) => update('timezone', e.target.value)}
                  placeholder='America/Sao_Paulo'
                  className={inputCls}
                />
              </Field>
            </div>
          )}

          <div className='grid grid-cols-2 gap-3'>
            <Field label='Escopo'>
              <select
                value={form.scopeType}
                onChange={(e) =>
                  update('scopeType', e.target.value as AutomationScopeType)
                }
                className={inputCls}
              >
                {SCOPE_TYPES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </Field>
            {requiresScope && (
              <Field label='ID do escopo'>
                <input
                  type='text'
                  value={form.scopeId}
                  onChange={(e) => update('scopeId', e.target.value)}
                  placeholder='Space/Folder/List ID'
                  className={inputCls}
                />
              </Field>
            )}
          </div>

          <section>
            <div className='mb-2 flex items-center justify-between'>
              <h4 className='text-xs font-semibold uppercase text-muted-foreground'>
                Condições (AND)
              </h4>
              <button
                type='button'
                onClick={addCondition}
                className='text-xs text-primary hover:underline'
              >
                + Adicionar condição
              </button>
            </div>
            <div className='space-y-2'>
              {form.conditions.length === 0 && (
                <p className='text-xs text-muted-foreground'>
                  Sem condições. A automação roda sempre que o gatilho disparar.
                </p>
              )}
              {form.conditions.map((c, i) => (
                <div
                  key={i}
                  className='flex flex-wrap items-center gap-2 rounded-md border border-border p-2'
                >
                  <input
                    type='text'
                    value={c.field}
                    onChange={(e) =>
                      updateCondition(i, { field: e.target.value })
                    }
                    placeholder='campo (ex: priority)'
                    className={cn(inputCls, 'flex-1 min-w-[120px]')}
                  />
                  <select
                    value={c.operator}
                    onChange={(e) =>
                      updateCondition(i, {
                        operator: e.target.value as ConditionOperator,
                      })
                    }
                    className={cn(inputCls, 'w-[140px]')}
                  >
                    {CONDITION_OPERATORS.map((op) => (
                      <option key={op} value={op}>
                        {op}
                      </option>
                    ))}
                  </select>
                  <input
                    type='text'
                    value={
                      c.value === undefined || c.value === null
                        ? ''
                        : typeof c.value === 'string'
                          ? c.value
                          : JSON.stringify(c.value)
                    }
                    onChange={(e) =>
                      updateCondition(i, { value: e.target.value })
                    }
                    placeholder='valor'
                    className={cn(inputCls, 'flex-1 min-w-[120px]')}
                  />
                  <button
                    type='button'
                    onClick={() => removeCondition(i)}
                    className='text-xs text-error-base hover:underline'
                  >
                    Remover
                  </button>
                </div>
              ))}
            </div>
          </section>

          <section>
            <div className='mb-2 flex items-center justify-between'>
              <h4 className='text-xs font-semibold uppercase text-muted-foreground'>
                Ações (sequenciais)
              </h4>
              <button
                type='button'
                onClick={addAction}
                className='text-xs text-primary hover:underline'
              >
                + Adicionar ação
              </button>
            </div>
            <div className='space-y-2'>
              {form.actions.length === 0 && (
                <p className='text-xs text-error-base'>
                  Pelo menos uma ação é obrigatória.
                </p>
              )}
              {form.actions.map((a, i) => (
                <div
                  key={i}
                  className='space-y-2 rounded-md border border-border p-2'
                >
                  <div className='flex items-center gap-2'>
                    <span className='text-xs text-muted-foreground'>
                      #{i + 1}
                    </span>
                    <select
                      value={a.type}
                      onChange={(e) =>
                        updateAction(i, { type: e.target.value })
                      }
                      className={cn(inputCls, 'flex-1')}
                    >
                      <option value=''>Selecione uma ação</option>
                      {(actions.data ?? []).map((act) => (
                        <option key={act.id} value={act.id}>
                          {act.label}
                        </option>
                      ))}
                    </select>
                    <button
                      type='button'
                      onClick={() => moveAction(i, -1)}
                      disabled={i === 0}
                      className='h-7 rounded px-2 text-xs hover:bg-bg-weak-50 disabled:opacity-40'
                    >
                      ↑
                    </button>
                    <button
                      type='button'
                      onClick={() => moveAction(i, 1)}
                      disabled={i === form.actions.length - 1}
                      className='h-7 rounded px-2 text-xs hover:bg-bg-weak-50 disabled:opacity-40'
                    >
                      ↓
                    </button>
                    <button
                      type='button'
                      onClick={() => removeAction(i)}
                      className='h-7 rounded px-2 text-xs text-error-base hover:bg-error-lighter'
                    >
                      Remover
                    </button>
                  </div>
                  <textarea
                    value={JSON.stringify(a.params, null, 2)}
                    onChange={(e) => {
                      try {
                        const parsed = JSON.parse(e.target.value || '{}');
                        updateAction(i, {
                          params:
                            parsed && typeof parsed === 'object' ? parsed : {},
                        });
                      } catch {
                        // ignora json inválido — UI segue editando o texto
                      }
                    }}
                    placeholder='{"workflowStatusId": "..."}'
                    rows={3}
                    className={cn(inputCls, 'font-mono text-[12px]')}
                  />
                </div>
              ))}
            </div>
          </section>

          <label className='flex items-center gap-2 text-sm'>
            <input
              type='checkbox'
              checked={form.isActive}
              onChange={(e) => update('isActive', e.target.checked)}
            />
            Ativa
          </label>

          <div className='flex justify-end gap-2 pt-2'>
            <button
              type='button'
              onClick={() => onOpenChange(false)}
              disabled={isPending}
              className='h-9 rounded-md border border-border bg-bg-white-0 px-4 text-sm hover:bg-bg-weak-50'
            >
              Cancelar
            </button>
            <button
              type='submit'
              disabled={
                isPending ||
                !form.name.trim() ||
                !form.trigger ||
                form.actions.length === 0
              }
              className='h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50'
            >
              {isPending ? 'Salvando...' : isEdit ? 'Salvar' : 'Criar'}
            </button>
          </div>
        </form>
      </Modal.Content>
    </Modal.Root>
  );
}

const inputCls =
  'h-9 w-full rounded-md border border-border bg-bg-white-0 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary';

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className='flex flex-col gap-1'>
      <span className='text-xs font-medium text-muted-foreground'>{label}</span>
      {children}
    </label>
  );
}
