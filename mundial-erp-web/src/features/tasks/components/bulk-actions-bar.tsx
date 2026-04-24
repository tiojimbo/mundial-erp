'use client';

import { useState, type ReactNode } from 'react';
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
import { cn } from '@/lib/cn';
import { useTasksSelectionStore } from '@/stores/tasks-selection.store';
import * as Popover from '@/components/ui/popover';
import * as Modal from '@/components/ui/modal';
import * as Button from '@/components/ui/button';

const iconBtn =
  'flex h-8 cursor-pointer items-center gap-1.5 rounded-lg px-2.5 ' +
  'text-[12px] font-medium text-white/80 transition-colors ' +
  'hover:bg-white/10 hover:text-white ' +
  'disabled:pointer-events-none disabled:opacity-40 outline-none';

function Divider() {
  return <div className='h-5 w-px shrink-0 bg-white/20' aria-hidden />;
}

function PopoverAction({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof RiRecordCircleLine;
  label: string;
  children?: ReactNode;
}) {
  return (
    <Popover.Root>
      <Popover.Trigger className={iconBtn} aria-label={label}>
        <Icon className='size-3.5' />
        {label}
      </Popover.Trigger>
      <Popover.Content align='center' sideOffset={12} className='min-w-[200px]'>
        {children ?? (
          <p className='text-paragraph-xs text-text-soft-400'>Em breve.</p>
        )}
      </Popover.Content>
    </Popover.Root>
  );
}

export function BulkActionsBar() {
  const selectedIds = useTasksSelectionStore((s) => s.selectedIds);
  const clear = useTasksSelectionStore((s) => s.clear);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const count = selectedIds.length;

  if (count === 0) return null;

  const canArchive = false;

  const handleMove = () => {};
  const handleAdd = () => {};
  const handleDuplicate = () => {};
  const handleArchive = () => {};
  const handleDelete = () => {
    setConfirmDelete(false);
    clear();
  };

  return (
    <>
      <div
        role='toolbar'
        aria-label='Ações em massa de tarefas'
        style={{ backgroundColor: '#18181B' }}
        className={cn(
          'fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-1',
          'rounded-xl border border-white/10 px-2 py-1.5',
          'shadow-2xl',
        )}
      >
        <div
          style={{ backgroundColor: '#3F3F46' }}
          className='flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-semibold text-white'
        >
          <span>
            {count} {count === 1 ? 'Tarefa selecionada' : 'Tarefas selecionadas'}
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

        <PopoverAction icon={RiRecordCircleLine} label='Status' />
        <PopoverAction icon={RiUserAddLine} label='Responsável' />
        <PopoverAction icon={RiCalendarLine} label='Data' />
        <PopoverAction icon={RiFlag2Line} label='Prioridade' />
        <PopoverAction icon={RiPriceTag3Line} label='Tags' />

        <button
          type='button'
          className={iconBtn}
          onClick={handleMove}
          aria-label='Mover tarefas'
        >
          <RiDragMoveLine className='size-3.5' />
          Mover
        </button>
        <button
          type='button'
          className={iconBtn}
          onClick={handleAdd}
          aria-label='Adicionar a lista'
        >
          <RiListIndefinite className='size-3.5' />
          Adicionar
        </button>

        <Divider />

        <button
          type='button'
          className={iconBtn}
          onClick={handleDuplicate}
          aria-label='Duplicar tarefas'
        >
          <RiFileCopyLine className='size-3.5' />
        </button>
        <button
          type='button'
          className={iconBtn}
          onClick={handleArchive}
          disabled={!canArchive}
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
          <Popover.Content align='end' sideOffset={12} className='min-w-[180px]'>
            <p className='text-paragraph-xs text-text-soft-400'>Em breve.</p>
          </Popover.Content>
        </Popover.Root>
      </div>

      <Modal.Root open={confirmDelete} onOpenChange={setConfirmDelete}>
        <Modal.Content>
          <Modal.Header
            title={`Excluir ${count} ${count === 1 ? 'tarefa' : 'tarefas'}?`}
            description='Esta ação não pode ser desfeita.'
          />
          <Modal.Footer>
            <Modal.Close asChild>
              <Button.Root variant='neutral' mode='stroke' size='small'>
                Cancelar
              </Button.Root>
            </Modal.Close>
            <Button.Root
              variant='error'
              mode='filled'
              size='small'
              onClick={handleDelete}
            >
              Excluir
            </Button.Root>
          </Modal.Footer>
        </Modal.Content>
      </Modal.Root>
    </>
  );
}
