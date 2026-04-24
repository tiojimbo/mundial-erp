'use client';

import { useEffect, useId, useMemo, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as Dialog from '@radix-ui/react-dialog';
import { Command } from 'cmdk';
import { toast } from 'sonner';
import {
  RiCloseLine,
  RiLoader4Line,
  RiFolderOpenLine,
  RiSearchLine,
  RiCheckLine,
  RiArrowDownSLine,
} from '@remixicon/react';
import { cn } from '@/lib/cn';
import { useCreateTask } from '../hooks/use-create-task';
import {
  createTaskFormSchema,
  type CreateTaskFormData,
} from '../schemas/task.schema';
import type { CreateTaskPayload } from '../types/task.types';
import { useDepartmentSummaries } from '@/features/navigation/hooks/use-department-summaries';
import { useAreaSummaries } from '@/features/navigation/hooks/use-area-summaries';
import type { ProcessSummary } from '@/features/navigation/types/process-summary.types';

/**
 * Dialog para criar uma Task a partir de um dos tres contextos de
 * navegacao (Department, Area, Process).
 *
 * Regras:
 * - Se `lockedProcessId` for passado, o campo `processId` e travado
 *   (vinda da tela do processo).
 * - Se `areaId` for passado, listamos processes daquela area.
 * - Se `departmentId` for passado, cascata Area -> Process.
 *
 * O endpoint real e `POST /api/v1/processes/:processId/tasks` — quando
 * `statusId` nao e enviado, o backend resolve automaticamente o primeiro
 * status `NOT_STARTED` do workflow do processo.
 */
export type CreateTaskDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Se fornecido, trava o Process (vinda da tela do processo). */
  lockedProcessId?: string;
  /** Se fornecido, pre-seleciona Area e lista processes dessa area. */
  areaId?: string;
  /** Se fornecido, pre-seleciona Department e lista areas/processes. */
  departmentId?: string;
  /** Nome opcional do Process quando `lockedProcessId` esta definido. */
  lockedProcessName?: string;
  /** Callback apos sucesso com o taskId criado (para navegacao). */
  onCreated?: (taskId: string) => void;
};

const PRIORITIES: Array<{
  value: CreateTaskFormData['priority'];
  label: string;
  tone: string;
}> = [
  { value: 'LOW', label: 'Baixa', tone: 'text-text-sub-600' },
  { value: 'NORMAL', label: 'Normal', tone: 'text-text-strong-950' },
  { value: 'HIGH', label: 'Alta', tone: 'text-warning-base' },
  { value: 'URGENT', label: 'Urgente', tone: 'text-error-base' },
];

type ProcessOption = {
  id: string;
  name: string;
  areaId: string | null;
  areaName: string | null;
};

export function CreateTaskDialog({
  open,
  onOpenChange,
  lockedProcessId,
  lockedProcessName,
  areaId,
  departmentId,
  onCreated,
}: CreateTaskDialogProps) {
  const createTask = useCreateTask();
  const titleId = useId();
  const descId = useId();

  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CreateTaskFormData>({
    resolver: zodResolver(createTaskFormSchema),
    defaultValues: {
      processId: lockedProcessId ?? '',
      title: '',
      description: '',
      priority: 'NORMAL',
      dueDate: '',
    },
  });

  // Reset quando abrir/fechar ou quando trocar o contexto bloqueado.
  useEffect(() => {
    if (open) {
      reset({
        processId: lockedProcessId ?? '',
        title: '',
        description: '',
        priority: 'NORMAL',
        dueDate: '',
      });
    }
  }, [open, lockedProcessId, reset]);

  const isLocked = Boolean(lockedProcessId);
  const useDepartment = !isLocked && Boolean(departmentId);
  const useArea = !isLocked && !useDepartment && Boolean(areaId);

  // Carrega sumarios conforme o contexto.
  const deptQuery = useDepartmentSummaries(
    useDepartment ? (departmentId as string) : '',
    false,
  );
  const areaQuery = useAreaSummaries(
    useArea ? (areaId as string) : '',
    false,
  );

  // Lista de areas derivada (para cascata Department -> Area -> Process).
  const [selectedAreaId, setSelectedAreaId] = useState<string>('');

  useEffect(() => {
    if (!useDepartment) {
      setSelectedAreaId('');
      return;
    }
    // Primeiro render/aberto: limpa selecao local ao reabrir.
    if (open) setSelectedAreaId('');
  }, [open, useDepartment]);

  const areaOptions = useMemo(() => {
    if (!useDepartment || !deptQuery.data) return [] as Array<{
      id: string;
      name: string;
    }>;
    const seen = new Map<string, string>();
    for (const p of deptQuery.data) {
      if (p.areaId && p.areaName && !seen.has(p.areaId)) {
        seen.set(p.areaId, p.areaName);
      }
    }
    return Array.from(seen, ([id, name]) => ({ id, name })).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  }, [useDepartment, deptQuery.data]);

  const processOptions = useMemo<ProcessOption[]>(() => {
    const fromDept = (list: ProcessSummary[] | undefined) =>
      (list ?? []).map((p) => ({
        id: p.id,
        name: p.name,
        areaId: p.areaId,
        areaName: p.areaName,
      }));

    if (useDepartment) {
      const all = fromDept(deptQuery.data);
      if (!selectedAreaId) return all;
      return all.filter((p) => p.areaId === selectedAreaId);
    }
    if (useArea) return fromDept(areaQuery.data);
    return [];
  }, [useDepartment, useArea, deptQuery.data, areaQuery.data, selectedAreaId]);

  // Sempre que o usuario trocar a area, limpar o processId.
  useEffect(() => {
    if (useDepartment) {
      setValue('processId', '');
    }
  }, [selectedAreaId, useDepartment, setValue]);

  const processId = watch('processId');
  const selectedProcess = useMemo(() => {
    if (lockedProcessId) {
      return {
        id: lockedProcessId,
        name: lockedProcessName ?? 'Processo atual',
        areaId: null,
        areaName: null,
      } satisfies ProcessOption;
    }
    return processOptions.find((p) => p.id === processId) ?? null;
  }, [lockedProcessId, lockedProcessName, processId, processOptions]);

  const isLoadingContext =
    (useDepartment && deptQuery.isLoading) ||
    (useArea && areaQuery.isLoading);

  const isPending = createTask.isPending || isSubmitting;

  function handleOpenChange(nextOpen: boolean) {
    if (isPending) return;
    onOpenChange(nextOpen);
  }

  function onSubmit(values: CreateTaskFormData) {
    const payload: CreateTaskPayload = {
      processId: values.processId,
      title: values.title.trim(),
      description: values.description?.trim() || undefined,
      priority: values.priority,
      // `<input type="date">` retorna YYYY-MM-DD; convertemos para ISO datetime
      // em UTC no final do dia para evitar drift de fuso horario no backend.
      dueDate: values.dueDate
        ? new Date(`${values.dueDate}T23:59:59.000Z`).toISOString()
        : undefined,
      // `statusId` propositalmente omitido — o backend resolve automaticamente
      // com o primeiro status NOT_STARTED do workflow do processo.
    };

    createTask.mutate(payload, {
      onSuccess: (task) => {
        toast.success('Tarefa criada');
        onOpenChange(false);
        onCreated?.(task.id);
      },
      onError: (err) => {
        toast.error(err.message || 'Erro ao criar tarefa');
      },
    });
  }

  const hasNoContext = !isLocked && !useDepartment && !useArea;

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay
          className={cn(
            'fixed inset-0 z-50 bg-overlay backdrop-blur-[4px]',
            'data-[state=open]:animate-in data-[state=open]:fade-in-0',
            'data-[state=closed]:animate-out data-[state=closed]:fade-out-0',
          )}
        />
        <Dialog.Content
          aria-labelledby={titleId}
          aria-describedby={descId}
          className={cn(
            'fixed left-1/2 top-1/2 z-50 w-full max-w-[520px] -translate-x-1/2 -translate-y-1/2',
            'rounded-20 bg-bg-white-0 shadow-regular-md',
            'focus:outline-none',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0',
            'data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95',
          )}
        >
          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            {/* Header */}
            <div className="relative flex items-start gap-3 border-b border-stroke-soft-200 px-5 py-4">
              <div className="flex-1 space-y-1">
                <Dialog.Title
                  id={titleId}
                  className="text-label-sm text-text-strong-950"
                >
                  Nova tarefa
                </Dialog.Title>
                <Dialog.Description
                  id={descId}
                  className="text-paragraph-xs text-text-sub-600"
                >
                  Preencha os campos para criar uma tarefa no processo.
                </Dialog.Description>
              </div>
              <Dialog.Close asChild>
                <button
                  type="button"
                  aria-label="Fechar"
                  disabled={isPending}
                  className="rounded-md p-1 text-text-sub-600 transition-colors hover:bg-bg-weak-50 hover:text-text-strong-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stroke-strong-950/50 disabled:opacity-50"
                >
                  <RiCloseLine className="size-4" />
                </button>
              </Dialog.Close>
            </div>

            {/* Body */}
            <div className="space-y-4 p-5">
              {hasNoContext && (
                <div className="rounded-lg border border-stroke-soft-200 bg-bg-weak-50 px-3 py-2.5 text-paragraph-sm text-text-sub-600">
                  Selecione um contexto (departamento, area ou processo) antes
                  de criar a tarefa.
                </div>
              )}

              {/* Process (locked) */}
              {isLocked && (
                <div className="space-y-1.5">
                  <label className="text-label-sm text-text-strong-950">
                    Processo
                  </label>
                  <div className="flex items-center gap-2 rounded-lg border border-stroke-soft-200 bg-bg-weak-50 px-3 py-2">
                    <RiFolderOpenLine
                      aria-hidden
                      className="size-4 text-text-sub-600"
                    />
                    <span className="truncate text-paragraph-sm text-text-strong-950">
                      {selectedProcess?.name ?? 'Processo atual'}
                    </span>
                    <span className="ml-auto rounded-md bg-bg-white-0 px-1.5 py-0.5 text-paragraph-xs text-text-sub-600 ring-1 ring-stroke-soft-200">
                      Fixado
                    </span>
                  </div>
                  <input
                    type="hidden"
                    {...register('processId')}
                    value={lockedProcessId}
                    readOnly
                  />
                </div>
              )}

              {/* Cascade: Department -> Area select */}
              {useDepartment && (
                <div className="space-y-1.5">
                  <label
                    htmlFor="create-task-area"
                    className="text-label-sm text-text-strong-950"
                  >
                    Area <span className="text-text-soft-400">(opcional)</span>
                  </label>
                  <div className="relative">
                    <select
                      id="create-task-area"
                      value={selectedAreaId}
                      onChange={(e) => setSelectedAreaId(e.target.value)}
                      disabled={isLoadingContext || areaOptions.length === 0}
                      className="h-9 w-full appearance-none rounded-lg border border-stroke-soft-200 bg-bg-white-0 pl-3 pr-9 text-paragraph-sm text-text-strong-950 shadow-regular-xs outline-none transition-colors hover:bg-bg-weak-50 focus-visible:border-stroke-strong-950 focus-visible:ring-2 focus-visible:ring-stroke-strong-950/30 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <option value="">Todas as areas</option>
                      {areaOptions.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name}
                        </option>
                      ))}
                    </select>
                    <RiArrowDownSLine
                      aria-hidden
                      className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-text-sub-600"
                    />
                  </div>
                </div>
              )}

              {/* Process select (cmdk) */}
              {!isLocked && (useDepartment || useArea) && (
                <div className="space-y-1.5">
                  <label
                    htmlFor="create-task-process"
                    className="text-label-sm text-text-strong-950"
                  >
                    Processo <span className="text-error-base">*</span>
                  </label>
                  <Controller
                    name="processId"
                    control={control}
                    render={({ field }) => (
                      <ProcessCombobox
                        id="create-task-process"
                        value={field.value}
                        onChange={field.onChange}
                        options={processOptions}
                        isLoading={isLoadingContext}
                        invalid={Boolean(errors.processId)}
                      />
                    )}
                  />
                  {errors.processId && (
                    <p className="text-paragraph-xs text-error-base">
                      {errors.processId.message}
                    </p>
                  )}
                </div>
              )}

              {/* Title */}
              <div className="space-y-1.5">
                <label
                  htmlFor="create-task-title"
                  className="text-label-sm text-text-strong-950"
                >
                  Titulo <span className="text-error-base">*</span>
                </label>
                <textarea
                  id="create-task-title"
                  rows={2}
                  autoFocus
                  placeholder="O que precisa ser feito?"
                  aria-invalid={Boolean(errors.title)}
                  {...register('title')}
                  className={cn(
                    'w-full resize-none rounded-lg border bg-bg-white-0 px-3 py-2 text-paragraph-sm text-text-strong-950 shadow-regular-xs outline-none transition-colors',
                    'placeholder:text-text-soft-400',
                    'focus-visible:ring-2',
                    errors.title
                      ? 'border-error-base focus-visible:border-error-base focus-visible:ring-error-base/30'
                      : 'border-stroke-soft-200 hover:bg-bg-weak-50 focus-visible:border-stroke-strong-950 focus-visible:ring-stroke-strong-950/30',
                  )}
                />
                {errors.title && (
                  <p className="text-paragraph-xs text-error-base">
                    {errors.title.message}
                  </p>
                )}
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label
                  htmlFor="create-task-description"
                  className="text-label-sm text-text-strong-950"
                >
                  Descricao{' '}
                  <span className="text-text-soft-400">(opcional)</span>
                </label>
                <textarea
                  id="create-task-description"
                  rows={4}
                  placeholder="Contexto, links, criterios de aceite..."
                  aria-invalid={Boolean(errors.description)}
                  {...register('description')}
                  className={cn(
                    'w-full resize-none rounded-lg border bg-bg-white-0 px-3 py-2 text-paragraph-sm text-text-strong-950 shadow-regular-xs outline-none transition-colors',
                    'placeholder:text-text-soft-400',
                    'focus-visible:ring-2',
                    errors.description
                      ? 'border-error-base focus-visible:border-error-base focus-visible:ring-error-base/30'
                      : 'border-stroke-soft-200 hover:bg-bg-weak-50 focus-visible:border-stroke-strong-950 focus-visible:ring-stroke-strong-950/30',
                  )}
                />
                {errors.description && (
                  <p className="text-paragraph-xs text-error-base">
                    {errors.description.message}
                  </p>
                )}
              </div>

              {/* Priority + DueDate */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label
                    htmlFor="create-task-priority"
                    className="text-label-sm text-text-strong-950"
                  >
                    Prioridade
                  </label>
                  <div className="relative">
                    <select
                      id="create-task-priority"
                      {...register('priority')}
                      className="h-9 w-full appearance-none rounded-lg border border-stroke-soft-200 bg-bg-white-0 pl-3 pr-9 text-paragraph-sm text-text-strong-950 shadow-regular-xs outline-none transition-colors hover:bg-bg-weak-50 focus-visible:border-stroke-strong-950 focus-visible:ring-2 focus-visible:ring-stroke-strong-950/30"
                    >
                      {PRIORITIES.map((p) => (
                        <option key={p.value} value={p.value}>
                          {p.label}
                        </option>
                      ))}
                    </select>
                    <RiArrowDownSLine
                      aria-hidden
                      className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-text-sub-600"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label
                    htmlFor="create-task-duedate"
                    className="text-label-sm text-text-strong-950"
                  >
                    Prazo
                  </label>
                  <input
                    id="create-task-duedate"
                    type="date"
                    {...register('dueDate')}
                    className="h-9 w-full rounded-lg border border-stroke-soft-200 bg-bg-white-0 px-3 text-paragraph-sm text-text-strong-950 shadow-regular-xs outline-none transition-colors hover:bg-bg-weak-50 focus-visible:border-stroke-strong-950 focus-visible:ring-2 focus-visible:ring-stroke-strong-950/30"
                  />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 border-t border-stroke-soft-200 px-5 py-4">
              <button
                type="button"
                onClick={() => handleOpenChange(false)}
                disabled={isPending}
                className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-stroke-soft-200 bg-bg-white-0 px-3 text-label-sm text-text-sub-600 shadow-regular-xs transition-colors hover:bg-bg-weak-50 hover:text-text-strong-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stroke-strong-950/50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                aria-busy={isPending}
                disabled={isPending || hasNoContext}
                className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-primary-base px-3 text-label-sm text-static-white shadow-regular-xs transition-colors hover:bg-primary-darker focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-base/50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isPending && (
                  <RiLoader4Line
                    aria-hidden
                    className="size-4 animate-spin"
                  />
                )}
                Criar
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

type ProcessComboboxProps = {
  id: string;
  value: string;
  onChange: (next: string) => void;
  options: ProcessOption[];
  isLoading: boolean;
  invalid: boolean;
};

function ProcessCombobox({
  id,
  value,
  onChange,
  options,
  isLoading,
  invalid,
}: ProcessComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const listboxId = useId();

  const selected = options.find((o) => o.id === value) ?? null;

  const filtered = useMemo(() => {
    if (!query.trim()) return options;
    const term = query.toLowerCase();
    return options.filter(
      (o) =>
        o.name.toLowerCase().includes(term) ||
        (o.areaName?.toLowerCase().includes(term) ?? false),
    );
  }, [options, query]);

  return (
    <div className="relative">
      <button
        id={id}
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={listboxId}
        onClick={() => setOpen((p) => !p)}
        disabled={isLoading || options.length === 0}
        className={cn(
          'flex h-9 w-full items-center gap-2 rounded-lg border bg-bg-white-0 px-3 text-left text-paragraph-sm shadow-regular-xs transition-colors',
          'focus-visible:outline-none focus-visible:ring-2',
          invalid
            ? 'border-error-base focus-visible:border-error-base focus-visible:ring-error-base/30'
            : 'border-stroke-soft-200 hover:bg-bg-weak-50 focus-visible:border-stroke-strong-950 focus-visible:ring-stroke-strong-950/30',
          'disabled:cursor-not-allowed disabled:opacity-60',
        )}
      >
        <RiFolderOpenLine
          aria-hidden
          className="size-4 shrink-0 text-text-sub-600"
        />
        {selected ? (
          <span className="flex-1 truncate text-text-strong-950">
            {selected.areaName ? `${selected.areaName} > ` : ''}
            {selected.name}
          </span>
        ) : (
          <span className="flex-1 truncate text-text-soft-400">
            {isLoading
              ? 'Carregando...'
              : options.length === 0
                ? 'Nenhum processo disponivel'
                : 'Selecione um processo'}
          </span>
        )}
        <RiArrowDownSLine
          aria-hidden
          className="size-4 shrink-0 text-text-sub-600"
        />
      </button>

      {open && (
        <div
          id={listboxId}
          role="listbox"
          className={cn(
            'absolute left-0 right-0 top-[calc(100%+4px)] z-[60]',
            'overflow-hidden rounded-xl border border-stroke-soft-200 bg-bg-white-0 shadow-regular-md',
          )}
        >
          <Command shouldFilter={false} className="flex flex-col">
            <div className="flex items-center gap-2 border-b border-stroke-soft-200 px-3 py-2">
              <RiSearchLine
                aria-hidden
                className="size-4 text-text-sub-600"
              />
              <Command.Input
                value={query}
                onValueChange={setQuery}
                placeholder="Buscar processo..."
                className="w-full bg-transparent text-paragraph-sm text-text-strong-950 outline-none placeholder:text-text-soft-400"
              />
            </div>
            <Command.List className="max-h-56 overflow-y-auto p-1">
              <Command.Empty className="px-3 py-4 text-center text-paragraph-xs text-text-sub-600">
                Nenhum processo encontrado.
              </Command.Empty>
              {filtered.map((opt) => (
                <Command.Item
                  key={opt.id}
                  value={opt.id}
                  onSelect={(v) => {
                    onChange(v);
                    setOpen(false);
                    setQuery('');
                  }}
                  className={cn(
                    'flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-paragraph-sm text-text-strong-950',
                    'data-[selected=true]:bg-bg-weak-50',
                    'aria-selected:bg-bg-weak-50',
                  )}
                >
                  <RiFolderOpenLine
                    aria-hidden
                    className="size-4 text-text-sub-600"
                  />
                  <span className="flex-1 truncate">
                    {opt.areaName ? (
                      <>
                        <span className="text-text-sub-600">
                          {opt.areaName}
                        </span>
                        <span className="px-1 text-text-soft-400">/</span>
                      </>
                    ) : null}
                    {opt.name}
                  </span>
                  {opt.id === value && (
                    <RiCheckLine
                      aria-hidden
                      className="size-4 text-primary-base"
                    />
                  )}
                </Command.Item>
              ))}
            </Command.List>
          </Command>
        </div>
      )}
    </div>
  );
}
