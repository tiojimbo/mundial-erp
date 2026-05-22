'use client';

import { useState } from 'react';
import {
  RiCloseLine,
  RiRecordCircleLine,
  RiUserAddLine,
  RiCalendarLine,
  RiFlag2Line,
  RiPriceTag3Line,
  RiDragMoveLine,
  RiListIndefinite,
  RiFileCopyLine,
  RiArchiveLine,
  RiDeleteBinLine,
  RiMoreLine,
} from '@remixicon/react';
import * as Dialog from '@radix-ui/react-dialog';
import { cn } from '@/lib/cn';
import { useTasksSelectionStore } from '@/stores/tasks-selection.store';
import * as Popover from '@/components/ui/popover';
import {
  useBulkDeleteTasks,
  useBulkUpdateTasks,
} from '../hooks/use-bulk-tasks';
import { useUsers } from '@/features/settings/hooks/use-users';
import { useTags } from '../hooks/use-tags';
import type { TaskPriority } from '../types/task.types';

const iconBtn =
  'flex h-8 cursor-pointer items-center gap-1.5 rounded-lg px-2.5 ' +
  'text-[12px] font-medium text-white/80 transition-colors ' +
  'hover:bg-white/10 hover:text-white ' +
  'disabled:pointer-events-none disabled:opacity-40 outline-none';

const popoverItem =
  'flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 ' +
  'text-[12px] text-text-strong-950 transition-colors hover:bg-bg-weak-50';

function Divider() {
  return <div className='h-5 w-px shrink-0 bg-white/20' aria-hidden />;
}

const PRIORITIES: { value: TaskPriority; label: string; color: string }[] = [
  { value: 'URGENT', label: 'Urgente', color: '#dc2626' },
  { value: 'HIGH', label: 'Alta', color: '#f97316' },
  { value: 'NORMAL', label: 'Normal', color: '#3b82f6' },
  { value: 'LOW', label: 'Baixa', color: '#94a3b8' },
  { value: 'NONE', label: 'Nenhuma', color: '#9ca3af' },
];

export function BulkActionsBar() {
  const selectedIds = useTasksSelectionStore((s) => s.selectedIds);
  const clear = useTasksSelectionStore((s) => s.clear);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const count = selectedIds.length;

  const bulkUpdate = useBulkUpdateTasks();
  const bulkDelete = useBulkDeleteTasks();
  const { data: users } = useUsers();
  const { data: tags } = useTags();

  if (count === 0) return null;

  function applyToAll(patch: Record<string, unknown>) {
    bulkUpdate.mutate(selectedIds.map((id) => ({ id, ...patch })));
  }

  const handlePriority = (priority: TaskPriority) => applyToAll({ priority });
  const handleAssignee = (userId: string | null) =>
    applyToAll({ primaryAssigneeId: userId });
  const handleDueDate = (date: string | null) => applyToAll({ dueDate: date });
  const handleStartDate = (date: string | null) =>
    applyToAll({ startDate: date });
  const handleArchive = () => {
    applyToAll({ archived: true });
    clear();
  };
  const handleDelete = () => {
    bulkDelete.mutate(selectedIds);
    setConfirmDelete(false);
    clear();
  };
  // Move/Adicionar: exigiriam picker de list — placeholder por agora.

  return (
    <>
      <div
        role='toolbar'
        aria-label='Ações em massa de tarefas'
        style={{ backgroundColor: '#18181B' }}
        className={cn(
          'fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-1',
          'shadow-2xl rounded-xl border border-white/10 px-2 py-1.5',
        )}
      >
        <div
          style={{ backgroundColor: '#3F3F46' }}
          className='flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-semibold text-white'
        >
          <span>
            {count}{' '}
            {count === 1 ? 'Tarefa selecionada' : 'Tarefas selecionadas'}
          </span>
          <button
            type='button'
            onClick={clear}
            aria-label='Limpar seleção'
            className='ml-0.5 flex size-4 cursor-pointer items-center justify-center rounded-full transition-colors hover:bg-white/20'
          >
            <RiCloseLine className='size-3' />
          </button>
        </div>

        <Divider />

        <Popover.Root>
          <Popover.Trigger className={iconBtn} aria-label='Status'>
            <RiRecordCircleLine className='size-3.5' />
            Status
          </Popover.Trigger>
          <Popover.Content
            align='center'
            sideOffset={12}
            className='min-w-[220px] p-1'
          >
            <p className='px-2 py-1.5 text-paragraph-xs text-text-soft-400'>
              Selecione um status na lista da tarefa.
            </p>
          </Popover.Content>
        </Popover.Root>

        <Popover.Root>
          <Popover.Trigger className={iconBtn} aria-label='Responsável'>
            <RiUserAddLine className='size-3.5' />
            Responsável
          </Popover.Trigger>
          <Popover.Content
            align='center'
            sideOffset={12}
            className='max-h-[280px] min-w-[220px] overflow-y-auto p-1'
          >
            <button
              type='button'
              className={popoverItem}
              onClick={() => handleAssignee(null)}
            >
              Sem responsável
            </button>
            {(users?.data ?? []).map((u) => (
              <button
                key={u.id}
                type='button'
                className={popoverItem}
                onClick={() => handleAssignee(u.id)}
              >
                {u.name ?? u.email}
              </button>
            ))}
          </Popover.Content>
        </Popover.Root>

        <Popover.Root>
          <Popover.Trigger className={iconBtn} aria-label='Data'>
            <RiCalendarLine className='size-3.5' />
            Data
          </Popover.Trigger>
          <Popover.Content
            align='center'
            sideOffset={12}
            className='min-w-[240px] space-y-2 p-3'
          >
            <div>
              <label className='block text-paragraph-xs text-text-sub-600'>
                Início
              </label>
              <input
                type='date'
                className='mt-1 w-full rounded-md border border-stroke-soft-200 px-2 py-1 text-[12px]'
                onChange={(e) =>
                  handleStartDate(
                    e.target.value
                      ? new Date(e.target.value).toISOString()
                      : null,
                  )
                }
              />
            </div>
            <div>
              <label className='block text-paragraph-xs text-text-sub-600'>
                Prazo
              </label>
              <input
                type='date'
                className='mt-1 w-full rounded-md border border-stroke-soft-200 px-2 py-1 text-[12px]'
                onChange={(e) =>
                  handleDueDate(
                    e.target.value
                      ? new Date(e.target.value).toISOString()
                      : null,
                  )
                }
              />
            </div>
            <button
              type='button'
              className='w-full rounded-md border border-stroke-soft-200 px-2 py-1 text-[12px] text-text-sub-600 hover:bg-bg-weak-50'
              onClick={() => {
                handleStartDate(null);
                handleDueDate(null);
              }}
            >
              Limpar datas
            </button>
          </Popover.Content>
        </Popover.Root>

        <Popover.Root>
          <Popover.Trigger className={iconBtn} aria-label='Prioridade'>
            <RiFlag2Line className='size-3.5' />
            Prioridade
          </Popover.Trigger>
          <Popover.Content
            align='center'
            sideOffset={12}
            className='min-w-[180px] p-1'
          >
            {PRIORITIES.map((p) => (
              <button
                key={p.value}
                type='button'
                className={popoverItem}
                onClick={() => handlePriority(p.value)}
              >
                <span
                  className='size-2 rounded-full'
                  style={{ backgroundColor: p.color }}
                />
                {p.label}
              </button>
            ))}
          </Popover.Content>
        </Popover.Root>

        <Popover.Root>
          <Popover.Trigger className={iconBtn} aria-label='Tags'>
            <RiPriceTag3Line className='size-3.5' />
            Tags
          </Popover.Trigger>
          <Popover.Content
            align='center'
            sideOffset={12}
            className='max-h-[280px] min-w-[220px] overflow-y-auto p-1'
          >
            {(tags ?? []).length === 0 ? (
              <p className='px-2 py-1.5 text-paragraph-xs text-text-soft-400'>
                Nenhuma tag disponível.
              </p>
            ) : (
              (tags ?? []).map((t) => (
                <button
                  key={t.id}
                  type='button'
                  className={popoverItem}
                  onClick={() => {
                    /* TODO: bulk tag add via dedicated endpoint */
                  }}
                >
                  <span
                    className='size-2 rounded-full'
                    style={{ backgroundColor: t.color }}
                  />
                  {t.name}
                </button>
              ))
            )}
          </Popover.Content>
        </Popover.Root>

        <button
          type='button'
          className={iconBtn}
          aria-label='Mover tarefas'
          disabled
          title='Em breve'
        >
          <RiDragMoveLine className='size-3.5' />
          Mover
        </button>
        <button
          type='button'
          className={iconBtn}
          aria-label='Adicionar a lista'
          disabled
          title='Em breve'
        >
          <RiListIndefinite className='size-3.5' />
          Adicionar
        </button>

        <Divider />

        <button
          type='button'
          className={iconBtn}
          aria-label='Duplicar tarefas'
          disabled
          title='Em breve'
        >
          <RiFileCopyLine className='size-3.5' />
        </button>
        <button
          type='button'
          className={iconBtn}
          onClick={handleArchive}
          aria-label='Arquivar tarefas'
        >
          <RiArchiveLine className='size-3.5' />
        </button>
        <button
          type='button'
          className={iconBtn}
          onClick={() => setConfirmDelete(true)}
          aria-label='Excluir tarefas'
        >
          <RiDeleteBinLine className='size-3.5 text-red-400' />
        </button>

        <Popover.Root>
          <Popover.Trigger className={iconBtn} aria-label='Mais ações'>
            <RiMoreLine className='size-3.5' />
          </Popover.Trigger>
          <Popover.Content
            align='end'
            sideOffset={12}
            className='min-w-[180px]'
          >
            <p className='text-paragraph-xs text-text-soft-400'>Em breve.</p>
          </Popover.Content>
        </Popover.Root>
      </div>

      {/* Modal de confirmacao — UI alinhada com o modal "Criar espaco":
          overlay simples bg-black/50 (sem blur/animacao), rounded-lg,
          sem classes de animate-in/out. */}
      <Dialog.Root open={confirmDelete} onOpenChange={setConfirmDelete}>
        <Dialog.Portal>
          <Dialog.Overlay className='fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4' />
          <Dialog.Content className='shadow-lg fixed left-[50%] top-[50%] z-50 flex w-full max-w-md translate-x-[-50%] translate-y-[-50%] flex-col gap-4 rounded-lg border border-[oklch(0.922_0_0)] bg-white p-6'>
            <div className='flex flex-col gap-2 text-center sm:text-left'>
              <Dialog.Title className='text-[18px] font-semibold leading-none'>
                Excluir {count} {count === 1 ? 'tarefa' : 'tarefas'}?
              </Dialog.Title>
              <Dialog.Description className='text-[14px] font-normal text-[oklch(0.556_0_0)]'>
                Esta ação não pode ser desfeita.
              </Dialog.Description>
            </div>

            <div className='flex items-center justify-end gap-2 pt-2'>
              <button
                type='button'
                onClick={() => setConfirmDelete(false)}
                className='shadow-xs focus-visible:ring-[oklch(0.708_0.165_254.624)]/50 inline-flex h-9 cursor-pointer items-center justify-center rounded-md border border-[oklch(0.922_0_0)] bg-white px-4 py-2 text-[14px] font-medium outline-none transition-all hover:bg-[oklch(0.97_0_0)] focus-visible:ring-[3px]'
              >
                Cancelar
              </button>
              <button
                type='button'
                onClick={handleDelete}
                className='shadow-xs inline-flex h-9 cursor-pointer items-center justify-center rounded-md px-4 py-2 text-[14px] font-medium text-white outline-none transition-all'
                style={{ backgroundColor: '#dc2626' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#b91c1c';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#dc2626';
                }}
              >
                Excluir
              </button>
            </div>

            <Dialog.Close asChild>
              <button
                type='button'
                aria-label='Fechar'
                className='absolute right-4 top-4 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-[oklch(0.708_0.165_254.624)] focus:ring-offset-2 disabled:pointer-events-none'
              >
                <RiCloseLine className='size-4' />
                <span className='sr-only'>Fechar</span>
              </button>
            </Dialog.Close>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
