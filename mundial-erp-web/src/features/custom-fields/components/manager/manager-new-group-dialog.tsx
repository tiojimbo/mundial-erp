'use client';

import { useEffect, useState } from 'react';
import * as Modal from '@/components/ui/modal';
import { useCreateCustomFieldGroup } from '../../hooks/use-custom-field-groups';

interface ManagerNewGroupDialogProps {
  open: boolean;
  onClose: () => void;
}

export function ManagerNewGroupDialog({
  open,
  onClose,
}: ManagerNewGroupDialogProps) {
  const [name, setName] = useState('');
  const [color, setColor] = useState('');
  const createMutation = useCreateCustomFieldGroup();
  const resetCreate = createMutation.reset;

  useEffect(() => {
    if (open) {
      setName('');
      setColor('');
      resetCreate();
    }
  }, [open, resetCreate]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (name.trim().length === 0) return;
    createMutation.mutate(
      {
        name: name.trim(),
        color: color || undefined,
      },
      {
        onSuccess: () => onClose(),
      },
    );
  };

  return (
    <Modal.Root open={open} onOpenChange={(next) => !next && onClose()}>
      <Modal.Content overlayClassName='bg-black/60 backdrop-blur-none'>
        <Modal.Header>
          <Modal.Title>Novo grupo</Modal.Title>
        </Modal.Header>
        <form onSubmit={handleSubmit}>
          <Modal.Body className='flex flex-col gap-3'>
            <label className='flex flex-col gap-1 text-paragraph-sm'>
              <span className='text-[11px] font-medium uppercase tracking-wide text-muted-foreground'>
                Nome
              </span>
              <input
                type='text'
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoFocus
                className='h-9 rounded-md border border-input bg-background px-3 text-paragraph-sm'
              />
            </label>
            <label className='flex flex-col gap-1 text-paragraph-sm'>
              <span className='text-[11px] font-medium uppercase tracking-wide text-muted-foreground'>
                Cor (hex, opcional)
              </span>
              <input
                type='text'
                value={color}
                onChange={(e) => setColor(e.target.value)}
                placeholder='#3b82f6'
                className='h-9 rounded-md border border-input bg-background px-3 text-paragraph-sm'
              />
            </label>
            {createMutation.isError ? (
              <p className='text-paragraph-xs text-destructive'>
                Erro ao criar grupo.
              </p>
            ) : null}
          </Modal.Body>
          <Modal.Footer>
            <button
              type='button'
              onClick={onClose}
              className='hover:bg-muted/60 rounded-md border border-input bg-background px-3 py-2 text-paragraph-sm'
            >
              Cancelar
            </button>
            <button
              type='submit'
              disabled={createMutation.isPending}
              className='rounded-md bg-primary-base px-3 py-2 text-paragraph-sm font-medium text-static-white hover:opacity-90 disabled:opacity-50'
            >
              {createMutation.isPending ? 'Criando...' : 'Criar grupo'}
            </button>
          </Modal.Footer>
        </form>
      </Modal.Content>
    </Modal.Root>
  );
}
