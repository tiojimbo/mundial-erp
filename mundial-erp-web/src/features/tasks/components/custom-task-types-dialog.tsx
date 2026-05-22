'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Pencil, Plus, Trash2, X } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';
import {
  useCustomTaskTypes,
  useDeleteCustomTaskType,
} from '@/features/tasks/hooks/use-custom-task-types';
import type { CustomTaskType } from '@/features/tasks/types/task.types';
import { cn } from '@/lib/cn';
import { getIconByName } from './icon-picker';
import { CreateCustomTaskTypeDialog } from './create-custom-task-type-dialog';
import { EditCustomTaskTypeDialog } from './edit-custom-task-type-dialog';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  spaceId: string | null;
};

function isDefaultType(type: CustomTaskType): boolean {
  return type.isBuiltin;
}

export function CustomTaskTypesDialog({ open, onOpenChange, spaceId }: Props) {
  const { data, isLoading } = useCustomTaskTypes();
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<CustomTaskType | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CustomTaskType | null>(null);
  const deleteType = useDeleteCustomTaskType();

  const items = useMemo<CustomTaskType[]>(() => {
    if (!Array.isArray(data)) return [];
    return [...data].sort((a, b) => {
      if (a.value === 'Tarefa') return -1;
      if (b.value === 'Tarefa') return 1;
      if (a.value === 'Marco') return -1;
      if (b.value === 'Marco') return 1;
      if (a.isBuiltin !== b.isBuiltin) return a.isBuiltin ? -1 : 1;
      return a.value.localeCompare(b.value);
    });
  }, [data]);

  async function confirmDelete() {
    if (!deleteTarget) return;
    const targetSpaceId = deleteTarget.spaceId ?? null;
    try {
      await deleteType.mutateAsync({
        spaceId: targetSpaceId,
        taskTypeId: deleteTarget.id,
      });
      toast.success('Tipo de tarefa removido');
      setDeleteTarget(null);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Falha ao remover tipo de tarefa.';
      toast.error(message);
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className='fixed inset-0 z-50 bg-black/50' />
        <Dialog.Content
          className={cn(
            'shadow-lg fixed left-1/2 top-1/2 z-50 flex max-h-[85vh] w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 flex-col gap-4 overflow-hidden rounded-lg border bg-background p-0 sm:max-w-2xl',
          )}
        >
          <div className='flex shrink-0 flex-col gap-2 p-6 pb-4 text-left'>
            <div className='flex items-center justify-between'>
              <div>
                <Dialog.Title className='text-lg font-bold'>
                  Tipos de tarefa
                </Dialog.Title>
                <Dialog.Description className='text-sm mt-1 text-muted-foreground'>
                  Personalize nomes e ícones dos tipos de tarefa.
                </Dialog.Description>
              </div>
              <button
                type='button'
                onClick={() => setCreateOpen(true)}
                className='text-sm shadow-xs inline-flex h-8 shrink-0 cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-md border bg-background px-2.5 font-medium transition-all hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50'
              >
                <Plus className='size-3.5' />
                Create Task Type
              </button>
            </div>
          </div>
          <div className='h-px w-full shrink-0 bg-border' />
          <div className='min-h-0 flex-1 overflow-y-auto px-6 pb-6'>
            <div className='rounded-lg border border-border'>
              <div className='bg-muted/50 text-xs grid grid-cols-[1fr_200px] border-b border-border px-4 py-2.5 font-medium text-muted-foreground'>
                <span>Name</span>
                <span>Created by</span>
              </div>
              <div>
                {isLoading ? (
                  <div className='text-sm px-4 py-6 text-center text-muted-foreground'>
                    Carregando tipos...
                  </div>
                ) : items.length === 0 ? (
                  <div className='text-sm px-4 py-6 text-center text-muted-foreground'>
                    Nenhum tipo cadastrado.
                  </div>
                ) : (
                  items.map((type) => {
                    const Icon = getIconByName(type.icon);
                    const isDefault = isDefaultType(type);
                    const canMutate = !type.isBuiltin;
                    const creatorName =
                      type.creator?.name ??
                      (type.isBuiltin ? 'Sistema' : 'Workspace');
                    const creatorInitial = (creatorName || '?')
                      .slice(0, 1)
                      .toUpperCase();
                    return (
                      <div
                        key={type.id}
                        className='hover:bg-accent/30 group grid grid-cols-[1fr_200px] items-center border-b border-border px-4 py-3 last:border-0'
                      >
                        <div className='flex items-center gap-3'>
                          <Icon
                            className='size-[18px] shrink-0 text-muted-foreground'
                            style={
                              type.color ? { color: type.color } : undefined
                            }
                            aria-hidden
                          />
                          <span className='text-sm font-medium'>
                            {type.value}
                            {isDefault && (
                              <span className='text-xs ml-2 text-muted-foreground'>
                                (default)
                              </span>
                            )}
                          </span>
                        </div>
                        <div className='flex items-center justify-between'>
                          <div className='flex items-center gap-2'>
                            <div className='bg-primary text-primary-foreground flex size-5 items-center justify-center rounded-full text-[10px] font-medium'>
                              {creatorInitial}
                            </div>
                            <span className='text-sm text-muted-foreground'>
                              {creatorName}
                            </span>
                          </div>
                          <div
                            className={cn(
                              'flex items-center gap-0.5 transition-opacity',
                              canMutate
                                ? 'opacity-0 group-hover:opacity-100'
                                : 'opacity-0',
                            )}
                          >
                            <button
                              type='button'
                              disabled={!canMutate}
                              onClick={() => setEditTarget(type)}
                              aria-label={`Editar ${type.value}`}
                              className='inline-flex size-7 cursor-pointer items-center justify-center rounded-md transition-all hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50'
                            >
                              <Pencil className='size-3.5' />
                            </button>
                            <button
                              type='button'
                              disabled={!canMutate}
                              onClick={() => setDeleteTarget(type)}
                              aria-label={`Excluir ${type.value}`}
                              className='inline-flex size-7 cursor-pointer items-center justify-center rounded-md text-destructive transition-all hover:bg-accent hover:text-destructive disabled:pointer-events-none disabled:opacity-50'
                            >
                              <Trash2 className='size-3.5' />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
          <Dialog.Close asChild>
            <button
              type='button'
              aria-label='Fechar'
              className='rounded-xs absolute right-4 top-4 opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2'
            >
              <X className='size-4' />
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>

      <CreateCustomTaskTypeDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        spaceId={spaceId}
      />

      <EditCustomTaskTypeDialog
        open={!!editTarget}
        onOpenChange={(o) => !o && setEditTarget(null)}
        task={editTarget}
        fallbackSpaceId={spaceId}
      />

      <Dialog.Root
        open={!!deleteTarget}
        onOpenChange={(o: boolean) => !o && setDeleteTarget(null)}
      >
        <Dialog.Portal>
          <Dialog.Overlay className='fixed inset-0 z-[70] bg-black/50' />
          <Dialog.Content
            role='alertdialog'
            className={cn(
              'shadow-lg fixed left-1/2 top-1/2 z-[70] grid w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 gap-4 rounded-lg border bg-background p-6 sm:max-w-md',
            )}
          >
            <Dialog.Title className='text-lg font-semibold'>
              Remover tipo de tarefa
            </Dialog.Title>
            <Dialog.Description className='text-sm text-muted-foreground'>
              Tem certeza que deseja remover o tipo &quot;{deleteTarget?.value}
              &quot;? Tarefas com este tipo ficarão sem tipo atribuído.
            </Dialog.Description>
            <div className='flex flex-col-reverse gap-2 sm:flex-row sm:justify-end'>
              <button
                type='button'
                onClick={() => setDeleteTarget(null)}
                disabled={deleteType.isPending}
                className='text-sm shadow-xs inline-flex h-9 items-center justify-center rounded-md border bg-background px-4 py-2 font-medium transition-all hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50'
              >
                Cancelar
              </button>
              <button
                type='button'
                onClick={confirmDelete}
                disabled={deleteType.isPending}
                className='text-sm text-destructive-foreground shadow-xs hover:bg-destructive/90 inline-flex h-9 cursor-pointer items-center justify-center rounded-md bg-destructive px-4 py-2 font-medium transition-all disabled:pointer-events-none disabled:opacity-50'
              >
                {deleteType.isPending ? 'Removendo...' : 'Remover'}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </Dialog.Root>
  );
}
