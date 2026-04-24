'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { X } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';
import { useCreateCustomTaskType } from '@/features/tasks/hooks/use-custom-task-types';
import { IconPicker } from './icon-picker';
import { cn } from '@/lib/cn';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const NAME_MAX = 16;
const DESC_MAX = 100;
const DEFAULT_ICON = 'CircleDot';

export function CreateCustomTaskTypeDialog({ open, onOpenChange }: Props) {
  const [icon, setIcon] = useState<string>(DEFAULT_ICON);
  const [name, setName] = useState('');
  const [namePlural, setNamePlural] = useState('');
  const [description, setDescription] = useState('');

  const createType = useCreateCustomTaskType();

  useEffect(() => {
    if (open) {
      setIcon(DEFAULT_ICON);
      setName('');
      setNamePlural('');
      setDescription('');
    }
  }, [open]);

  const canSubmit = name.trim().length > 0 && !createType.isPending;

  async function handleSubmit() {
    if (!canSubmit) return;
    try {
      await createType.mutateAsync({
        name: name.trim(),
        namePlural: namePlural.trim() || undefined,
        description: description.trim() || undefined,
        icon,
      });
      toast.success('Tipo de tarefa criado');
      onOpenChange(false);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Falha ao criar tipo de tarefa.';
      toast.error(message);
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className='fixed inset-0 z-[60] bg-black/50' />
        <Dialog.Content
          className={cn(
            'fixed left-1/2 top-1/2 z-[60] grid w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 gap-4 overflow-visible rounded-lg border bg-background p-6 shadow-lg sm:max-w-[480px]',
          )}
        >
          <div className='flex flex-col gap-2 text-left'>
            <Dialog.Title className='text-lg font-semibold leading-none'>
              Criar tipo de tarefa
            </Dialog.Title>
          </div>

          <div className='space-y-4 py-2'>
            <div className='space-y-2'>
              <label className='text-xs font-medium text-muted-foreground'>
                Ícone
              </label>
              <IconPicker value={icon} onChange={setIcon} />
            </div>

            <div className='grid grid-cols-2 gap-4'>
              <div className='space-y-2'>
                <label className='text-xs font-medium'>
                  Nome singular <span className='text-destructive'>*</span>
                </label>
                <div className='relative w-full'>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value.slice(0, NAME_MAX))}
                    placeholder='Tarefa'
                    maxLength={NAME_MAX}
                    className='h-9 w-full min-w-0 rounded-md border border-input bg-transparent px-3 py-1 pr-12 text-sm shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50'
                  />
                  <span className='pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-muted-foreground'>
                    {name.length}/{NAME_MAX}
                  </span>
                </div>
              </div>
              <div className='space-y-2'>
                <label className='text-xs font-medium'>Nome plural</label>
                <div className='relative w-full'>
                  <input
                    value={namePlural}
                    onChange={(e) =>
                      setNamePlural(e.target.value.slice(0, NAME_MAX))
                    }
                    placeholder='Tarefas'
                    maxLength={NAME_MAX}
                    className='h-9 w-full min-w-0 rounded-md border border-input bg-transparent px-3 py-1 pr-12 text-sm shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50'
                  />
                  <span className='pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-muted-foreground'>
                    {namePlural.length}/{NAME_MAX}
                  </span>
                </div>
              </div>
            </div>

            <div className='space-y-2'>
              <label className='text-xs font-medium'>Descrição</label>
              <div className='relative'>
                <textarea
                  value={description}
                  onChange={(e) =>
                    setDescription(e.target.value.slice(0, DESC_MAX))
                  }
                  placeholder='Descreva o tipo de tarefa'
                  maxLength={DESC_MAX}
                  className='flex min-h-[80px] w-full resize-none rounded-md border border-input bg-transparent px-3 py-2 pr-16 text-sm shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50'
                />
                <span className='pointer-events-none absolute bottom-2 right-3 text-[11px] text-muted-foreground'>
                  {description.length}/{DESC_MAX}
                </span>
              </div>
            </div>
          </div>

          <div className='flex flex-col-reverse gap-2 sm:flex-row sm:justify-end'>
            <button
              type='button'
              onClick={() => onOpenChange(false)}
              disabled={createType.isPending}
              className='inline-flex h-9 items-center justify-center rounded-md border bg-background px-4 py-2 text-sm font-medium shadow-xs transition-all hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50'
            >
              Cancelar
            </button>
            <button
              type='button'
              onClick={handleSubmit}
              disabled={!canSubmit}
              className='inline-flex h-9 cursor-pointer items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-xs transition-all hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50'
            >
              {createType.isPending ? 'Criando...' : 'Criar tipo'}
            </button>
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
    </Dialog.Root>
  );
}
