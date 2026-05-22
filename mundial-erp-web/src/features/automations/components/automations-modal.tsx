'use client';

import { useMemo, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import {
  RiAddLine,
  RiArrowDownSLine,
  RiCloseLine,
  RiFlashlightLine,
} from '@remixicon/react';
import { Zap } from 'lucide-react';
import { cn } from '@/lib/cn';
import {
  useAutomationActions,
  useAutomationStatuses,
  useAutomationTriggers,
  useAutomations,
} from '../hooks/use-automations';
import type { Automation } from '../types/automation.types';
import { AutomationBuilderView } from './automation-builder-view';
import { AutomationRow } from './automation-row';

type Tab = 'browse' | 'manage' | 'usage' | 'audit' | 'webhooks' | 'recurring';
type StatusFilter = 'active' | 'inactive';

const TABS: Array<{ id: Tab; label: string; ready: boolean }> = [
  { id: 'browse', label: 'Browse', ready: false },
  { id: 'manage', label: 'Manage', ready: true },
  { id: 'usage', label: 'Usage', ready: false },
  { id: 'audit', label: 'Audit Log', ready: false },
  { id: 'webhooks', label: 'Webhooks', ready: false },
  { id: 'recurring', label: 'Recurring', ready: false },
];

export type AutomationsModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function AutomationsModal({
  open,
  onOpenChange,
}: AutomationsModalProps) {
  const [tab, setTab] = useState<Tab>('manage');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active');
  const [triggerFilter, setTriggerFilter] = useState<string>('');
  const [actionFilter, setActionFilter] = useState<string>('');
  const [conditionFilter, setConditionFilter] = useState<string>('');
  const [updatedByFilter, setUpdatedByFilter] = useState<string>('');

  const [view, setView] = useState<'list' | 'builder'>('list');
  const [editing, setEditing] = useState<Automation | null>(null);

  const automations = useAutomations();
  const triggers = useAutomationTriggers();
  const actions = useAutomationActions();
  useAutomationStatuses();

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const all = automations.data ?? [];
  const activeCount = all.filter((a) => a.isActive).length;
  const inactiveCount = all.length - activeCount;

  const filtered = useMemo(() => {
    return all.filter((a) => {
      if (statusFilter === 'active' && !a.isActive) return false;
      if (statusFilter === 'inactive' && a.isActive) return false;
      if (triggerFilter && a.trigger !== triggerFilter) return false;
      if (
        actionFilter &&
        !a.compiledActions.some((act) => act.type === actionFilter)
      )
        return false;
      if (
        conditionFilter &&
        !a.conditions.some((c) => c.field === conditionFilter)
      )
        return false;
      if (updatedByFilter && a.createdById !== updatedByFilter) return false;
      return true;
    });
  }, [
    all,
    statusFilter,
    triggerFilter,
    actionFilter,
    conditionFilter,
    updatedByFilter,
  ]);

  const conditionFields = useMemo(() => {
    const set = new Set<string>();
    for (const a of all) {
      for (const c of a.conditions) {
        if (c.field) set.add(c.field);
      }
    }
    return [...set].sort();
  }, [all]);

  const creators = useMemo(() => {
    const set = new Set<string>();
    for (const a of all) set.add(a.createdById);
    return [...set];
  }, [all]);

  const openCreate = () => {
    setEditing(null);
    setView('builder');
  };

  const openEdit = (a: Automation) => {
    setEditing(a);
    setView('builder');
  };

  const backToList = () => {
    setView('list');
    setEditing(null);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setView('list');
      setEditing(null);
    }
    onOpenChange(next);
  };

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className='fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4' />
        <Dialog.Content className='fixed left-[50%] top-[50%] z-50 flex h-[85vh] w-full max-w-[860px] translate-x-[-50%] translate-y-[-50%] flex-col overflow-hidden rounded-lg border border-stroke-soft-200 bg-bg-white-0 shadow-regular-md'>
          <Dialog.Title className='sr-only'>Automações</Dialog.Title>
          {view === 'builder' ? (
            <AutomationBuilderView
              editing={editing}
              onBack={backToList}
              onClose={() => handleOpenChange(false)}
            />
          ) : (
            <>
              {/* Header com tabs */}
              <div className='flex shrink-0 items-center justify-between border-b border-stroke-soft-200 px-5 py-3'>
                <div className='flex items-center gap-2.5'>
                  <Zap className='size-5 fill-[#ffb900] text-[#ffb900]' />
                  <h2 className='text-label-sm text-text-strong-950'>
                    Automações
                  </h2>
                </div>
                <nav className='flex items-center gap-1'>
                  {TABS.map((t) => (
                    <button
                      key={t.id}
                      type='button'
                      onClick={() => setTab(t.id)}
                      className={cn(
                        'rounded-md px-3 py-1.5 text-paragraph-xs font-medium transition-colors',
                        tab === t.id
                          ? 'bg-bg-weak-50 text-text-strong-950'
                          : 'text-text-sub-600 hover:text-text-strong-950',
                      )}
                    >
                      {t.label}
                    </button>
                  ))}
                </nav>
                <Dialog.Close asChild>
                  <button
                    type='button'
                    aria-label='Fechar'
                    className='inline-flex size-7 items-center justify-center rounded-md text-text-sub-600 hover:bg-bg-weak-50 hover:text-text-strong-950'
                  >
                    <RiCloseLine className='size-4' />
                  </button>
                </Dialog.Close>
              </div>

              {tab === 'manage' ? (
                <>
                  {/* Toolbar: escopo + Add */}
                  <div className='flex shrink-0 items-center justify-between border-b border-stroke-soft-200 px-5 py-3'>
                    <select
                      disabled
                      value='workspace'
                      className='h-8 rounded-md border border-stroke-soft-200 bg-bg-white-0 px-2 text-paragraph-xs text-text-sub-600'
                    >
                      <option value='workspace'>Todo o workspace</option>
                    </select>

                    <button
                      type='button'
                      onClick={openCreate}
                      className='inline-flex h-8 items-center gap-1.5 rounded-md border border-stroke-soft-200 bg-bg-white-0 px-2.5 text-paragraph-xs text-text-strong-950 hover:bg-bg-weak-50'
                    >
                      <RiAddLine className='size-3.5' />
                      Adicionar automação
                    </button>
                  </div>

                  {/* Filtros */}
                  <div className='flex shrink-0 items-center justify-between border-b border-stroke-soft-200 px-5 py-2.5'>
                    <div className='flex items-center gap-2'>
                      <button
                        type='button'
                        onClick={() => setStatusFilter('active')}
                        className={cn(
                          'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-paragraph-xs font-medium transition-colors',
                          statusFilter === 'active'
                            ? 'bg-bg-strong-950 text-static-white'
                            : 'text-text-sub-600 hover:text-text-strong-950',
                        )}
                      >
                        Ativas
                        <span
                          className={cn(
                            'inline-flex h-4 min-w-[16px] items-center justify-center rounded px-1 text-[10px]',
                            statusFilter === 'active'
                              ? 'bg-static-white/20 text-static-white'
                              : 'bg-bg-weak-50 text-text-sub-600',
                          )}
                        >
                          {activeCount}
                        </span>
                      </button>
                      <button
                        type='button'
                        onClick={() => setStatusFilter('inactive')}
                        className={cn(
                          'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-paragraph-xs font-medium transition-colors',
                          statusFilter === 'inactive'
                            ? 'bg-bg-strong-950 text-static-white'
                            : 'text-text-sub-600 hover:text-text-strong-950',
                        )}
                      >
                        Inativas
                        <span
                          className={cn(
                            'inline-flex h-4 min-w-[16px] items-center justify-center rounded px-1 text-[10px]',
                            statusFilter === 'inactive'
                              ? 'bg-static-white/20 text-static-white'
                              : 'bg-bg-weak-50 text-text-sub-600',
                          )}
                        >
                          {inactiveCount}
                        </span>
                      </button>
                    </div>

                    <div className='flex items-center gap-2'>
                      <FilterChip
                        label='Trigger'
                        value={triggerFilter}
                        onChange={setTriggerFilter}
                        options={(triggers.data ?? []).map((t) => ({
                          value: t.id,
                          label: t.label,
                        }))}
                      />
                      <FilterChip
                        label='Condição'
                        value={conditionFilter}
                        onChange={setConditionFilter}
                        options={conditionFields.map((f) => ({
                          value: f,
                          label: f,
                        }))}
                      />
                      <FilterChip
                        label='Ação'
                        value={actionFilter}
                        onChange={setActionFilter}
                        options={(actions.data ?? []).map((a) => ({
                          value: a.id,
                          label: a.label,
                        }))}
                      />
                      <FilterChip
                        label='Criado por'
                        value={updatedByFilter}
                        onChange={setUpdatedByFilter}
                        options={creators.map((id) => ({
                          value: id,
                          label: id.slice(0, 8),
                        }))}
                      />
                    </div>
                  </div>

                  {/* Conteúdo */}
                  <div className='relative flex-1 overflow-y-auto'>
                    {automations.isLoading ? (
                      <div className='py-16 text-center text-paragraph-sm text-text-sub-600'>
                        Carregando automações...
                      </div>
                    ) : automations.isError ? (
                      <div className='py-16 text-center text-paragraph-sm text-error-base'>
                        Erro ao carregar automações.
                      </div>
                    ) : filtered.length === 0 ? (
                      <EmptyState
                        onCreate={openCreate}
                        hasAny={all.length > 0}
                      />
                    ) : (
                      <div className='divide-y divide-stroke-soft-200'>
                        {filtered.map((a) => (
                          <AutomationRow
                            key={a.id}
                            automation={a}
                            onEdit={openEdit}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <ComingSoon
                  tabLabel={TABS.find((t) => t.id === tab)?.label ?? ''}
                />
              )}
            </>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function FilterChip({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  const active = Boolean(value);
  return (
    <div className='relative'>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          'h-7 cursor-pointer appearance-none rounded-md border border-stroke-soft-200 bg-bg-white-0 px-2 pr-6 text-paragraph-xs hover:bg-bg-weak-50',
          active ? 'text-text-strong-950' : 'text-text-sub-600',
        )}
      >
        <option value=''>{label}</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <RiArrowDownSLine className='pointer-events-none absolute right-1 top-1/2 size-3 -translate-y-1/2 text-text-sub-600' />
    </div>
  );
}

function EmptyState({
  onCreate,
  hasAny,
}: {
  onCreate: () => void;
  hasAny: boolean;
}) {
  return (
    <div className='flex flex-col items-center justify-center py-24'>
      <RiFlashlightLine className='mb-4 size-10 text-text-disabled-300' />
      <h3 className='mb-1.5 text-label-sm text-text-strong-950'>
        {hasAny
          ? 'Nenhuma automação bate com os filtros'
          : 'Crie sua primeira automação'}
      </h3>
      <p className='mb-5 max-w-sm text-center text-paragraph-xs text-text-sub-600'>
        {hasAny
          ? 'Limpe os filtros pra ver tudo, ou crie uma nova.'
          : 'Use automações pra disparar ações quando algo acontecer com suas tasks.'}
      </p>
      <button
        type='button'
        onClick={onCreate}
        className='inline-flex h-8 items-center gap-1.5 rounded-md border border-stroke-soft-200 bg-bg-white-0 px-3 text-paragraph-xs text-text-strong-950 hover:bg-bg-weak-50'
      >
        <RiAddLine className='size-3.5' />
        Adicionar automação
      </button>
    </div>
  );
}

function ComingSoon({ tabLabel }: { tabLabel: string }) {
  return (
    <div className='flex flex-1 flex-col items-center justify-center py-24'>
      <RiFlashlightLine className='mb-4 size-10 text-text-disabled-300' />
      <h3 className='mb-1.5 text-label-sm text-text-strong-950'>
        {tabLabel} — em breve
      </h3>
      <p className='max-w-sm text-center text-paragraph-xs text-text-sub-600'>
        Essa aba ainda não tem backend. Por enquanto, use a aba Manage pra
        gerenciar as automações.
      </p>
    </div>
  );
}
