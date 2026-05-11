'use client';

import { useState } from 'react';
import { RiAddLine, RiDeleteBinLine, RiPencilLine } from '@remixicon/react';
import {
  useAutomations,
  useDeleteAutomation,
  useToggleAutomation,
} from '../hooks/use-automations';
import type { Automation } from '../types/automation.types';
import { AutomationFormModal } from './automation-form-modal';

export function AutomationsListClient() {
  const automations = useAutomations();
  const toggle = useToggleAutomation();
  const remove = useDeleteAutomation();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Automation | null>(null);

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (a: Automation) => {
    setEditing(a);
    setFormOpen(true);
  };

  return (
    <div className='space-y-4 p-6'>
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-xl font-semibold'>Automações</h1>
          <p className='text-sm text-muted-foreground'>
            Gatilhos e ações que rodam automaticamente sobre tasks.
          </p>
        </div>
        <button
          type='button'
          onClick={openCreate}
          className='inline-flex h-9 items-center gap-2 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:opacity-90'
        >
          <RiAddLine className='size-4' aria-hidden />
          Nova automação
        </button>
      </div>

      {automations.isLoading && (
        <p className='text-sm text-muted-foreground'>Carregando...</p>
      )}
      {automations.isError && (
        <p className='text-sm text-destructive'>Falha ao carregar automações.</p>
      )}

      {automations.data && automations.data.length === 0 && (
        <div className='rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground'>
          Nenhuma automação configurada ainda. Clique em &quot;Nova automação&quot;
          para começar.
        </div>
      )}

      {automations.data && automations.data.length > 0 && (
        <ul className='space-y-2'>
          {automations.data.map((a) => (
            <li
              key={a.id}
              className='flex items-center justify-between gap-3 rounded-md border border-border bg-bg-white-0 p-3'
            >
              <div className='min-w-0 flex-1'>
                <div className='flex items-center gap-2'>
                  <span className='truncate text-sm font-medium'>{a.name}</span>
                  <span className='rounded bg-bg-weak-50 px-2 py-0.5 text-[10px] uppercase text-muted-foreground'>
                    {a.trigger}
                  </span>
                  <span className='rounded bg-bg-weak-50 px-2 py-0.5 text-[10px] uppercase text-muted-foreground'>
                    {a.scopeType}
                  </span>
                </div>
                {a.description && (
                  <p className='mt-0.5 truncate text-xs text-muted-foreground'>
                    {a.description}
                  </p>
                )}
                <p className='mt-1 text-[11px] text-muted-foreground'>
                  {a.compiledActions.length} ação(ões) •{' '}
                  {a.conditions.length} condição(ões) • Executada{' '}
                  {a.executionCount} vez(es)
                </p>
              </div>
              <ToggleSwitch
                checked={a.isActive}
                disabled={toggle.isPending}
                onChange={() => toggle.mutate(a.id)}
              />
              <button
                type='button'
                onClick={() => openEdit(a)}
                className='inline-flex h-8 items-center gap-1 rounded-md border border-border bg-bg-white-0 px-2 text-xs hover:bg-bg-weak-50'
                aria-label={`Editar ${a.name}`}
              >
                <RiPencilLine className='size-3.5' aria-hidden />
                Editar
              </button>
              <button
                type='button'
                onClick={() => {
                  if (confirm(`Remover automação "${a.name}"?`)) {
                    remove.mutate(a.id);
                  }
                }}
                disabled={remove.isPending}
                className='inline-flex h-8 items-center gap-1 rounded-md border border-error-base px-2 text-xs text-error-base hover:bg-error-lighter disabled:opacity-50'
                aria-label={`Remover ${a.name}`}
              >
                <RiDeleteBinLine className='size-3.5' aria-hidden />
                Remover
              </button>
            </li>
          ))}
        </ul>
      )}

      <AutomationFormModal
        open={formOpen}
        onOpenChange={setFormOpen}
        automation={editing}
      />
    </div>
  );
}

function ToggleSwitch({
  checked,
  disabled,
  onChange,
}: {
  checked: boolean;
  disabled: boolean;
  onChange: () => void;
}) {
  return (
    <button
      type='button'
      role='switch'
      aria-checked={checked}
      disabled={disabled}
      onClick={onChange}
      className={`relative h-5 w-9 rounded-full transition-colors ${
        checked ? 'bg-primary' : 'bg-bg-soft-200'
      } disabled:opacity-50`}
    >
      <span
        className={`absolute top-0.5 size-4 rounded-full bg-white transition-transform ${
          checked ? 'translate-x-[18px]' : 'translate-x-0.5'
        }`}
      />
    </button>
  );
}
