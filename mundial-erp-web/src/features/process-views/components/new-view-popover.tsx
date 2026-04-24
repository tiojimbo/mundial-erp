'use client';

import { useState } from 'react';
import {
  RiAddLine,
  RiArrowLeftLine,
  RiBarChart2Line,
  RiCalendar2Line,
  RiEyeOffLine,
  RiGlobalLine,
  RiLayoutColumnLine,
  RiListCheck2,
  type RemixiconComponentType,
} from '@remixicon/react';
import * as Popover from '@/components/ui/popover';
import { cn } from '@/lib/cn';
import { useCreateProcessView } from '../hooks/use-create-process-view';
import type {
  ProcessViewScope,
  ProcessViewType,
} from '../types/process-view.types';

type NewViewPopoverProps = {
  processId: string;
  trigger: React.ReactNode;
  onCreated?: (viewId: string) => void;
};

const TYPE_OPTIONS: ReadonlyArray<{
  type: ProcessViewType;
  label: string;
  Icon: RemixiconComponentType;
}> = [
  { type: 'LIST', label: 'Lista', Icon: RiListCheck2 },
  { type: 'BOARD', label: 'Quadro', Icon: RiLayoutColumnLine },
  { type: 'CALENDAR', label: 'Calendário', Icon: RiCalendar2Line },
  { type: 'GANTT', label: 'Gantt', Icon: RiBarChart2Line },
];

export function NewViewPopover({
  processId,
  trigger,
  onCreated,
}: NewViewPopoverProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<'pick-type' | 'config'>('pick-type');
  const [selectedType, setSelectedType] = useState<ProcessViewType | null>(
    null,
  );
  const [name, setName] = useState('');
  const [scope, setScope] = useState<ProcessViewScope>('workspace');

  const createView = useCreateProcessView();

  const reset = () => {
    setStep('pick-type');
    setSelectedType(null);
    setName('');
    setScope('workspace');
    createView.reset();
  };

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) reset();
  };

  const handlePickType = (type: ProcessViewType) => {
    setSelectedType(type);
    setStep('config');
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedType) return;
    const trimmed = name.trim();
    if (trimmed.length < 2) return;
    createView.mutate(
      {
        processId,
        name: trimmed,
        viewType: selectedType,
        config: { scope },
      },
      {
        onSuccess: (view) => {
          onCreated?.(view.id);
          setOpen(false);
          reset();
        },
      },
    );
  };

  const isSubmitDisabled =
    createView.isPending || name.trim().length < 2 || !selectedType;

  return (
    <Popover.Root open={open} onOpenChange={handleOpenChange}>
      <Popover.Trigger asChild>{trigger}</Popover.Trigger>
      <Popover.Content
        align="start"
        showArrow={false}
        className="w-80 p-6"
      >
        <header className="mb-6 flex items-center gap-2">
          {step === 'config' && (
            <button
              type="button"
              onClick={() => setStep('pick-type')}
              aria-label="Voltar para seleção de tipo"
              className="flex size-6 items-center justify-center rounded-md text-text-sub-600 transition-colors hover:bg-bg-weak-50 hover:text-text-strong-950"
            >
              <RiArrowLeftLine className="size-4" />
            </button>
          )}
          <h3 className="text-label-md font-semibold text-text-strong-950">
            Criar nova visualização
          </h3>
        </header>

        {step === 'pick-type' && (
          <div
            role="list"
            aria-label="Tipos de visualização"
            className="grid grid-cols-2 gap-4"
          >
            {TYPE_OPTIONS.map(({ type, label, Icon }) => (
              <button
                key={type}
                type="button"
                role="listitem"
                onClick={() => handlePickType(type)}
                className="group flex aspect-square w-full cursor-pointer flex-col items-center justify-center gap-1.5 overflow-hidden rounded-xl border border-stroke-soft-200 bg-bg-white-0 p-6 shadow-regular-xs transition-all duration-200 hover:bg-bg-weak-50 hover:shadow-regular-md active:scale-[0.98]"
              >
                <Icon
                  aria-hidden
                  className="size-7 text-text-sub-600 transition-all duration-200 group-hover:scale-110 group-hover:text-text-strong-950"
                />
                <span className="text-label-sm font-medium text-text-strong-950">
                  {label}
                </span>
              </button>
            ))}
          </div>
        )}

        {step === 'config' && selectedType && (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="space-y-2">
              <label
                htmlFor="new-view-name"
                className="text-label-sm font-medium text-text-strong-950"
              >
                Nome da visualização
              </label>
              <input
                id="new-view-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Digite o nome da visualização"
                autoFocus
                minLength={2}
                maxLength={80}
                className="h-9 w-full rounded-lg border border-stroke-soft-200 bg-bg-weak-50 px-3 text-paragraph-sm text-text-strong-950 outline-none transition-colors placeholder:text-text-soft-400 focus:border-primary-base focus:bg-bg-white-0 focus:ring-2 focus:ring-primary-alpha-16"
              />
            </div>

            <div className="space-y-2">
              <span className="text-label-sm font-medium text-text-strong-950">
                Visibilidade
              </span>
              <div
                role="radiogroup"
                aria-label="Visibilidade da visualização"
                className="grid grid-cols-2 gap-2"
              >
                <button
                  type="button"
                  role="radio"
                  aria-checked={scope === 'workspace'}
                  onClick={() => setScope('workspace')}
                  className={cn(
                    'flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-label-sm font-medium transition-all duration-200',
                    scope === 'workspace'
                      ? 'border-primary-base bg-primary-alpha-10 text-primary-base'
                      : 'border-stroke-soft-200 text-text-sub-600 hover:bg-bg-weak-50 hover:text-text-strong-950',
                  )}
                >
                  <RiGlobalLine aria-hidden className="size-3.5" />
                  Compartilhada
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked={scope === 'user'}
                  onClick={() => setScope('user')}
                  className={cn(
                    'flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-label-sm font-medium transition-all duration-200',
                    scope === 'user'
                      ? 'border-primary-base bg-primary-alpha-10 text-primary-base'
                      : 'border-stroke-soft-200 text-text-sub-600 hover:bg-bg-weak-50 hover:text-text-strong-950',
                  )}
                >
                  <RiEyeOffLine aria-hidden className="size-3.5" />
                  Privada
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitDisabled}
              className="flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-primary-base px-4 py-2 text-label-sm font-medium text-static-white transition-all duration-200 hover:bg-primary-darker focus:ring-2 focus:ring-primary-alpha-16 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {createView.isPending ? 'Criando…' : 'Criar visualização'}
            </button>
          </form>
        )}
      </Popover.Content>
    </Popover.Root>
  );
}

export { RiAddLine as NewViewTriggerIcon };
