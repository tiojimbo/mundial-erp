'use client';

import { useEffect, useMemo, useState } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { Command } from 'cmdk';
import { Plus, Search, X } from 'lucide-react';

import { cn } from '@/lib/cn';
import { useTasks } from '@/features/tasks/hooks/use-tasks';
import type { BaseFieldProps } from './field-base';
import { inputClass } from './field-base';
import { FieldShell } from './field-shell';

interface RelationshipItem {
  taskId: string;
  quantity: number;
}

interface RelationshipWithQuantityValue {
  items: RelationshipItem[];
  taskIds: string[];
}

function parseIds(raw: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const piece of raw.split(/[\s,]+/)) {
    const id = piece.trim();
    if (id.length === 0 || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

function isWithQuantityValue(v: unknown): v is RelationshipWithQuantityValue {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) return false;
  const obj = v as Record<string, unknown>;
  return Array.isArray(obj.items) && Array.isArray(obj.taskIds);
}

export function RelationshipField(
  props: BaseFieldProps<string[] | null>,
): JSX.Element {
  const cfg = props.definition.config as
    | Record<string, unknown>
    | null
    | undefined;
  if (cfg?.withQuantity === true) {
    return <RelationshipFieldWithQuantity {...props} />;
  }
  return <RelationshipFieldClassic {...props} />;
}

function RelationshipFieldClassic({
  definition,
  value,
  onChange,
  readOnly,
  error,
  inline,
}: BaseFieldProps<string[] | null>) {
  const isReadOnly = readOnly || definition.config?.readOnly === true;
  const relatedListId = (
    definition.config as Record<string, unknown> | null | undefined
  )?.relatedListId as string | undefined;
  const [open, setOpen] = useState(false);
  const selectedIds = useMemo(
    () => new Set(Array.isArray(value) ? value : []),
    [value],
  );

  const tasksQuery = useTasks(
    relatedListId ? { processIds: [relatedListId], limit: 50 } : undefined,
  );
  const tasks = useMemo(
    () => (tasksQuery.data?.data ?? []) as Array<{ id: string; title: string }>,
    [tasksQuery.data],
  );
  const selectedTasks = useMemo(
    () => tasks.filter((t) => selectedIds.has(t.id)),
    [tasks, selectedIds],
  );

  if (!inline) {
    return (
      <FieldShell
        definition={definition}
        error={error}
        hint={definition.config?.hint ?? 'IDs de tasks separados por virgula'}
        showLabel
      >
        {(controlProps) => (
          <textarea
            {...controlProps}
            className={`${inputClass} min-h-[60px] py-2`}
            value={Array.isArray(value) ? value.join(', ') : ''}
            readOnly={isReadOnly}
            placeholder='task-1, task-2'
            onChange={(event) => {
              const ids = parseIds(event.target.value);
              onChange(ids.length === 0 ? null : ids);
            }}
          />
        )}
      </FieldShell>
    );
  }

  const toggle = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    const arr = Array.from(next);
    onChange(arr.length === 0 ? null : arr);
  };

  return (
    <FieldShell definition={definition} error={error} showLabel={false}>
      {(controlProps) => (
        <Popover.Root open={open} onOpenChange={setOpen}>
          <div className='flex min-w-0 flex-nowrap items-center gap-1 overflow-x-auto overflow-y-hidden [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'>
            {selectedTasks.length === 0 ? (
              <span className='text-muted-foreground/60 text-xs shrink-0'>
                Nenhuma task relacionada
              </span>
            ) : (
              selectedTasks.map((t) => (
                <span
                  key={t.id}
                  className='bg-accent/50 inline-flex h-7 shrink-0 items-center gap-1 rounded-full px-2.5 text-[11px] font-medium text-foreground'
                >
                  <span className='max-w-[120px] truncate'>{t.title}</span>
                  <button
                    type='button'
                    onClick={() => toggle(t.id)}
                    className='rounded-full p-0.5 hover:bg-accent'
                    aria-label={`Remover ${t.title}`}
                  >
                    <X className='h-3 w-3' />
                  </button>
                </span>
              ))
            )}
            <Popover.Trigger asChild>
              <button
                {...controlProps}
                type='button'
                disabled={isReadOnly}
                className='border-border/60 hover:border-primary/35 hover:bg-accent/50 inline-flex h-7 shrink-0 items-center gap-1 rounded-full border border-dashed bg-transparent px-2.5 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground focus:outline-none disabled:cursor-not-allowed disabled:opacity-60'
              >
                <Plus className='h-3 w-3' />
              </button>
            </Popover.Trigger>
          </div>
          <Popover.Portal>
            <Popover.Content
              align='start'
              sideOffset={4}
              className='shadow-md z-[200] w-[280px] rounded-md border bg-popover p-0 text-popover-foreground outline-none'
            >
              <Command className='flex h-full w-full flex-col overflow-hidden rounded-md bg-popover text-popover-foreground'>
                <div className='flex h-9 items-center gap-2 border-b px-3'>
                  <Search className='h-4 w-4 shrink-0 opacity-50' />
                  <Command.Input
                    placeholder='Buscar tasks...'
                    className='text-sm h-9 w-full bg-transparent py-3 outline-none placeholder:text-muted-foreground'
                  />
                </div>
                <Command.List className='max-h-[300px] scroll-py-1 overflow-y-auto overflow-x-hidden'>
                  <Command.Empty className='text-xs px-3 py-6 text-center text-muted-foreground'>
                    {tasksQuery.isLoading
                      ? 'Carregando…'
                      : 'Nenhuma task encontrada'}
                  </Command.Empty>
                  <Command.Group className='overflow-hidden p-1'>
                    {tasks.map((t) => {
                      const isSelected = selectedIds.has(t.id);
                      return (
                        <Command.Item
                          key={t.id}
                          value={t.title}
                          onSelect={() => toggle(t.id)}
                          className={cn(
                            'data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground',
                            'text-xs relative flex cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 outline-none',
                            isSelected && 'font-medium',
                          )}
                        >
                          <span className='flex-1 truncate'>{t.title}</span>
                          {isSelected && (
                            <X
                              className='h-3 w-3 text-muted-foreground'
                              aria-label='selecionado'
                            />
                          )}
                        </Command.Item>
                      );
                    })}
                  </Command.Group>
                </Command.List>
              </Command>
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>
      )}
    </FieldShell>
  );
}

function RelationshipFieldWithQuantity({
  definition,
  value,
  onChange,
  readOnly,
  error,
}: BaseFieldProps<string[] | null>) {
  const isReadOnly = readOnly || definition.config?.readOnly === true;
  const cfg = (definition.config ?? {}) as Record<string, unknown>;
  const taskTypeIds = Array.isArray(cfg.taskTypeIds)
    ? (cfg.taskTypeIds as string[])
    : [];

  const rawValue = value as unknown;
  const currentItems: RelationshipItem[] = isWithQuantityValue(rawValue)
    ? rawValue.items
    : [];

  const [searchOpen, setSearchOpen] = useState(false);
  const [pendingTaskId, setPendingTaskId] = useState<string | null>(null);
  const [pendingQuantity, setPendingQuantity] = useState<string>('1');
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingQuantity, setEditingQuantity] = useState<string>('');

  const tasksQuery = useTasks(
    taskTypeIds.length > 0 ? { customTypeIds: taskTypeIds, limit: 100 } : undefined,
  );
  const tasks = useMemo(
    () => (tasksQuery.data?.data ?? []) as Array<{ id: string; title: string }>,
    [tasksQuery.data],
  );
  const tasksById = useMemo(() => {
    const map = new Map<string, { id: string; title: string }>();
    for (const t of tasks) map.set(t.id, t);
    return map;
  }, [tasks]);

  const emitChange = (next: RelationshipItem[]) => {
    const payload = next.length === 0 ? null : next;
    onChange(payload as unknown as string[] | null);
  };

  const confirmAdd = () => {
    if (!pendingTaskId) return;
    const qty = Number(pendingQuantity.replace(',', '.'));
    if (!Number.isFinite(qty) || qty < 0) return;
    if (currentItems.some((i) => i.taskId === pendingTaskId)) {
      setPendingTaskId(null);
      setPendingQuantity('1');
      setSearchOpen(false);
      return;
    }
    emitChange([...currentItems, { taskId: pendingTaskId, quantity: qty }]);
    setPendingTaskId(null);
    setPendingQuantity('1');
    setSearchOpen(false);
  };

  const removeItem = (taskId: string) => {
    emitChange(currentItems.filter((i) => i.taskId !== taskId));
  };

  const startEditing = (item: RelationshipItem) => {
    setEditingTaskId(item.taskId);
    setEditingQuantity(String(item.quantity));
  };

  const confirmEdit = () => {
    if (!editingTaskId) return;
    const qty = Number(editingQuantity.replace(',', '.'));
    if (!Number.isFinite(qty) || qty < 0) {
      setEditingTaskId(null);
      return;
    }
    emitChange(
      currentItems.map((i) =>
        i.taskId === editingTaskId ? { ...i, quantity: qty } : i,
      ),
    );
    setEditingTaskId(null);
  };

  useEffect(() => {
    if (!searchOpen) {
      setPendingTaskId(null);
      setPendingQuantity('1');
    }
  }, [searchOpen]);

  return (
    <FieldShell definition={definition} error={error} showLabel={false}>
      {(controlProps) => (
        <div className='flex min-w-0 flex-nowrap items-center gap-1 overflow-x-auto overflow-y-hidden [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'>
          {currentItems.length === 0 ? (
            <span className='text-muted-foreground/60 text-xs shrink-0'>
              Nenhum insumo
            </span>
          ) : (
            currentItems.map((item) => {
              const task = tasksById.get(item.taskId);
              const label = task?.title ?? item.taskId;
              return (
                <Popover.Root
                  key={item.taskId}
                  open={editingTaskId === item.taskId}
                  onOpenChange={(next) => {
                    if (!next) setEditingTaskId(null);
                  }}
                >
                  <Popover.Trigger asChild>
                    <span
                      className='bg-accent/50 hover:bg-accent inline-flex h-7 shrink-0 cursor-pointer items-center gap-1 rounded-full px-2.5 text-[11px] font-medium text-foreground transition-colors'
                      onClick={() => !isReadOnly && startEditing(item)}
                    >
                      <span className='max-w-[140px] truncate'>{label}</span>
                      <span className='text-muted-foreground'>·</span>
                      <span className='tabular-nums'>{item.quantity}</span>
                      {!isReadOnly ? (
                        <button
                          type='button'
                          onClick={(e) => {
                            e.stopPropagation();
                            removeItem(item.taskId);
                          }}
                          className='rounded-full p-0.5 hover:bg-accent'
                          aria-label={`Remover ${label}`}
                        >
                          <X className='h-3 w-3' />
                        </button>
                      ) : null}
                    </span>
                  </Popover.Trigger>
                  <Popover.Portal>
                    <Popover.Content
                      align='start'
                      sideOffset={4}
                      className='shadow-md z-[200] w-[220px] rounded-md border bg-popover p-3 text-popover-foreground outline-none'
                    >
                      <label className='text-xs mb-1.5 block text-muted-foreground'>
                        Quantidade de {label}
                      </label>
                      <input
                        type='number'
                        step='any'
                        min='0'
                        autoFocus
                        value={editingQuantity}
                        onChange={(e) => setEditingQuantity(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') confirmEdit();
                          if (e.key === 'Escape') setEditingTaskId(null);
                        }}
                        className={`${inputClass} h-8`}
                      />
                      <div className='mt-3 flex items-center justify-end gap-2'>
                        <button
                          type='button'
                          onClick={() => setEditingTaskId(null)}
                          className='text-xs h-7 rounded-md px-2 text-muted-foreground hover:bg-accent'
                        >
                          Cancelar
                        </button>
                        <button
                          type='button'
                          onClick={confirmEdit}
                          className='text-xs h-7 rounded-md bg-primary-base px-3 font-medium text-static-white hover:bg-primary-dark'
                        >
                          Salvar
                        </button>
                      </div>
                    </Popover.Content>
                  </Popover.Portal>
                </Popover.Root>
              );
            })
          )}
          <Popover.Root open={searchOpen} onOpenChange={setSearchOpen}>
            <Popover.Trigger asChild>
              <button
                {...controlProps}
                type='button'
                disabled={isReadOnly}
                className='border-border/60 hover:border-primary/35 hover:bg-accent/50 inline-flex h-7 shrink-0 items-center gap-1 rounded-full border border-dashed bg-transparent px-2.5 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground focus:outline-none disabled:cursor-not-allowed disabled:opacity-60'
              >
                <Plus className='h-3 w-3' />
              </button>
            </Popover.Trigger>
            <Popover.Portal>
              <Popover.Content
                align='start'
                sideOffset={4}
                className='shadow-md z-[200] w-[300px] rounded-md border bg-popover p-0 text-popover-foreground outline-none'
              >
                {pendingTaskId ? (
                  <div className='p-3'>
                    <label className='text-xs mb-1.5 block text-muted-foreground'>
                      Quantidade de{' '}
                      {tasksById.get(pendingTaskId)?.title ?? pendingTaskId}
                    </label>
                    <input
                      type='number'
                      step='any'
                      min='0'
                      autoFocus
                      value={pendingQuantity}
                      onChange={(e) => setPendingQuantity(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') confirmAdd();
                        if (e.key === 'Escape') setPendingTaskId(null);
                      }}
                      className={`${inputClass} h-8`}
                    />
                    <div className='mt-3 flex items-center justify-end gap-2'>
                      <button
                        type='button'
                        onClick={() => setPendingTaskId(null)}
                        className='text-xs h-7 rounded-md px-2 text-muted-foreground hover:bg-accent'
                      >
                        Voltar
                      </button>
                      <button
                        type='button'
                        onClick={confirmAdd}
                        className='text-xs h-7 rounded-md bg-primary-base px-3 font-medium text-static-white hover:bg-primary-dark'
                      >
                        Adicionar
                      </button>
                    </div>
                  </div>
                ) : (
                  <Command className='flex h-full w-full flex-col overflow-hidden rounded-md bg-popover text-popover-foreground'>
                    <div className='flex h-9 items-center gap-2 border-b px-3'>
                      <Search className='h-4 w-4 shrink-0 opacity-50' />
                      <Command.Input
                        placeholder='Buscar insumo...'
                        className='text-sm h-9 w-full bg-transparent py-3 outline-none placeholder:text-muted-foreground'
                      />
                    </div>
                    <Command.List className='max-h-[300px] scroll-py-1 overflow-y-auto overflow-x-hidden'>
                      <Command.Empty className='text-xs px-3 py-6 text-center text-muted-foreground'>
                        {tasksQuery.isLoading
                          ? 'Carregando…'
                          : 'Nenhum insumo encontrado'}
                      </Command.Empty>
                      <Command.Group className='overflow-hidden p-1'>
                        {tasks.map((t) => {
                          const alreadyAdded = currentItems.some(
                            (i) => i.taskId === t.id,
                          );
                          return (
                            <Command.Item
                              key={t.id}
                              value={t.title}
                              disabled={alreadyAdded}
                              onSelect={() => setPendingTaskId(t.id)}
                              className={cn(
                                'data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground',
                                'text-xs relative flex cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 outline-none',
                                alreadyAdded &&
                                  'pointer-events-none opacity-50',
                              )}
                            >
                              <span className='flex-1 truncate'>{t.title}</span>
                              {alreadyAdded ? (
                                <span className='text-[10px] text-muted-foreground'>
                                  já adicionado
                                </span>
                              ) : null}
                            </Command.Item>
                          );
                        })}
                      </Command.Group>
                    </Command.List>
                  </Command>
                )}
              </Popover.Content>
            </Popover.Portal>
          </Popover.Root>
        </div>
      )}
    </FieldShell>
  );
}
