'use client';

import { RiDeleteBinLine, RiPencilLine } from '@remixicon/react';
import { cn } from '@/lib/cn';
import {
  useDeleteAutomation,
  useToggleAutomation,
} from '../hooks/use-automations';
import type { Automation } from '../types/automation.types';

type AutomationRowProps = {
  automation: Automation;
  onEdit: (automation: Automation) => void;
};

export function AutomationRow({ automation, onEdit }: AutomationRowProps) {
  const toggle = useToggleAutomation();
  const remove = useDeleteAutomation();

  const handleDelete = () => {
    if (!window.confirm(`Remover "${automation.name}"?`)) return;
    remove.mutate(automation.id);
  };

  const firstAction = automation.compiledActions?.[0]?.type;

  return (
    <div className='flex items-center justify-between gap-3 px-5 py-3 hover:bg-bg-weak-50'>
      <div className='min-w-0 flex-1'>
        <div className='flex items-center gap-2'>
          <span className='truncate text-label-sm text-text-strong-950'>
            {automation.name}
          </span>
          <span className='rounded bg-bg-weak-50 px-2 py-0.5 text-[10px] uppercase text-text-sub-600'>
            {automation.trigger}
          </span>
          <span className='rounded bg-bg-weak-50 px-2 py-0.5 text-[10px] uppercase text-text-sub-600'>
            {automation.scopeType}
          </span>
        </div>
        {automation.description && (
          <p className='mt-0.5 truncate text-paragraph-xs text-text-sub-600'>
            {automation.description}
          </p>
        )}
        <p className='mt-1 text-[11px] text-text-sub-600'>
          {automation.compiledActions.length} ação(ões) ·{' '}
          {automation.conditions.length} condição(ões) ·{' '}
          {automation.executionCount} execução(ões)
          {firstAction && ` · primeira: ${firstAction}`}
        </p>
      </div>

      <ToggleSwitch
        checked={automation.isActive}
        disabled={toggle.isPending}
        onChange={() => toggle.mutate(automation.id)}
      />

      <button
        type='button'
        onClick={() => onEdit(automation)}
        className='inline-flex size-8 items-center justify-center rounded-md text-text-sub-600 hover:bg-bg-white-0 hover:text-text-strong-950'
        aria-label='Editar'
      >
        <RiPencilLine className='size-4' />
      </button>
      <button
        type='button'
        onClick={handleDelete}
        disabled={remove.isPending}
        className='inline-flex size-8 items-center justify-center rounded-md text-text-sub-600 hover:bg-bg-white-0 hover:text-error-base disabled:opacity-50'
        aria-label='Remover'
      >
        <RiDeleteBinLine className='size-4' />
      </button>
    </div>
  );
}

function ToggleSwitch({
  checked,
  disabled,
  onChange,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: () => void;
}) {
  return (
    <button
      type='button'
      role='switch'
      aria-checked={checked}
      onClick={onChange}
      disabled={disabled}
      className={cn(
        'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors disabled:opacity-50',
        checked ? 'bg-success-base' : 'bg-bg-soft-200',
      )}
    >
      <span
        className={cn(
          'shadow pointer-events-none inline-block size-4 transform rounded-full bg-static-white ring-0 transition-transform',
          checked ? 'translate-x-4' : 'translate-x-0',
        )}
      />
    </button>
  );
}
