'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Pencil, Plus, Trash2, X } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';
import { useCustomTaskTypes } from '@/features/tasks/hooks/use-custom-task-types';
import type { CustomTaskType } from '@/features/tasks/types/task.types';
import { cn } from '@/lib/cn';
import { getIconByName } from './icon-picker';
import { CreateCustomTaskTypeDialog } from './create-custom-task-type-dialog';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function isDefaultType(type: CustomTaskType): boolean {
  return type.id === 'builtin-task';
}

export function CustomTaskTypesDialog({ open, onOpenChange }: Props) {
  const { data, isLoading } = useCustomTaskTypes();
  const [createOpen, setCreateOpen] = useState(false);

  const items = useMemo<CustomTaskType[]>(() => {
    if (!Array.isArray(data)) return [];
    return [...data].sort((a, b) => {
      if (a.id === 'builtin-task') return -1;
      if (b.id === 'builtin-task') return 1;
      if (a.isBuiltin !== b.isBuiltin) return a.isBuiltin ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  }, [data]);

  function notImplemented() {
    toast.info('Em breve — gestão de tipos de tarefa em desenvolvimento.');
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className='fixed inset-0 z-50 bg-black/50' />
        <Dialog.Content
          className={cn(
            'fixed left-1/2 top-1/2 z-50 grid w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 gap-4 overflow-auto rounded-lg border bg-background p-0 shadow-lg sm:max-w-2xl',
          )}
        >
          <div className='flex flex-col gap-2 p-6 pb-4 text-left'>
            <div className='flex items-center justify-between'>
              <div>
                <Dialog.Title className='text-lg font-bold'>
                  Tipos de tarefa
                </Dialog.Title>
                <Dialog.Description className='mt-1 text-sm text-muted-foreground'>
                  Personalize nomes e ícones dos tipos de tarefa.
                </Dialog.Description>
              </div>
              <button
                type='button'
                onClick={() => setCreateOpen(true)}
                className='inline-flex h-8 shrink-0 cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-md border bg-background px-2.5 text-sm font-medium shadow-xs transition-all hover:bg-accent hover:text-accent-foreground'
              >
                <Plus className='size-3.5' />
                Create Task Type
              </button>
            </div>
          </div>
          <div className='h-px w-full shrink-0 bg-border' />
          <div className='px-6 pb-6'>
            <div className='rounded-lg border border-border'>
              <div className='grid grid-cols-[1fr_200px] border-b border-border bg-muted/50 px-4 py-2.5 text-xs font-medium text-muted-foreground'>
                <span>Name</span>
                <span>Created by</span>
              </div>
              <div>
                {isLoading ? (
                  <div className='px-4 py-6 text-center text-sm text-muted-foreground'>
                    Carregando tipos...
                  </div>
                ) : items.length === 0 ? (
                  <div className='px-4 py-6 text-center text-sm text-muted-foreground'>
                    Nenhum tipo cadastrado.
                  </div>
                ) : (
                  items.map((type) => {
                    const Icon = getIconByName(type.icon);
                    const isDefault = isDefaultType(type);
                    const canMutate = !type.isBuiltin;
                    return (
                      <div
                        key={type.id}
                        className='group grid grid-cols-[1fr_200px] items-center border-b border-border px-4 py-3 last:border-0 hover:bg-accent/30'
                      >
                        <div className='flex items-center gap-3'>
                          <Icon
                            className='size-[18px] shrink-0 text-muted-foreground'
                            style={type.color ? { color: type.color } : undefined}
                            aria-hidden
                          />
                          <span className='text-sm font-medium'>
                            {type.name}
                            {isDefault && (
                              <span className='ml-2 text-xs text-muted-foreground'>
                                (default)
                              </span>
                            )}
                          </span>
                        </div>
                        <div className='flex items-center justify-between'>
                          <div className='flex items-center gap-2'>
                            <div className='flex size-5 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground'>
                              {type.isBuiltin ? 'S' : 'M'}
                            </div>
                            <span className='text-sm text-muted-foreground'>
                              {type.isBuiltin ? 'Sistema' : 'Workspace'}
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
                              onClick={notImplemented}
                              aria-label={`Editar ${type.name}`}
                              className='inline-flex size-7 cursor-pointer items-center justify-center rounded-md transition-all hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50'
                            >
                              <Pencil className='size-3.5' />
                            </button>
                            <button
                              type='button'
                              disabled={!canMutate}
                              onClick={notImplemented}
                              aria-label={`Excluir ${type.name}`}
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
              className='absolute right-4 top-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2'
            >
              <X className='size-4' />
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
      <CreateCustomTaskTypeDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
      />
    </Dialog.Root>
  );
}
