'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as Dialog from '@radix-ui/react-dialog';
import { RiCloseLine } from '@remixicon/react';
import * as Button from '@/components/ui/button';
import { useNotification } from '@/hooks/use-notification';
import { useCreateApiToken } from '../hooks/use-api-tokens';
import {
  createApiTokenSchema,
  type CreateApiTokenFormData,
} from '../schemas/api-token.schema';
import type { ApiTokenCreated } from '../types/api-token.types';

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated: (token: ApiTokenCreated) => void;
};

const INPUT_CLASSES =
  'shadow-xs focus-visible:ring-[oklch(0.708_0.165_254.624)]/50 flex h-9 w-full min-w-0 rounded-md border border-[oklch(0.922_0_0)] bg-transparent px-3 py-1 text-[14px] outline-none transition-[color,box-shadow] placeholder:text-[oklch(0.556_0_0)] focus-visible:border-[oklch(0.708_0.165_254.624)] focus-visible:ring-[3px]';

export function CreateApiTokenModal({ open, onClose, onCreated }: Props) {
  const create = useCreateApiToken();
  const { notification } = useNotification();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isValid },
  } = useForm<CreateApiTokenFormData>({
    resolver: zodResolver(createApiTokenSchema),
    mode: 'onChange',
    defaultValues: { name: '' },
  });

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      reset();
      onClose();
    }
  }

  function onSubmit(data: CreateApiTokenFormData) {
    create.mutate(data, {
      onSuccess: (created) => {
        reset();
        onCreated(created);
      },
      onError: () => {
        notification({
          title: 'Erro',
          description: 'Falha ao criar API key. Tente novamente.',
          status: 'error',
        });
      },
    });
  }

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className='fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4' />
        <Dialog.Content className='shadow-lg fixed left-[50%] top-[50%] z-50 flex w-full max-w-lg translate-x-[-50%] translate-y-[-50%] flex-col gap-4 rounded-lg border border-[oklch(0.922_0_0)] bg-white p-6'>
          <div className='flex flex-col gap-2 text-center sm:text-left'>
            <Dialog.Title className='text-[18px] font-semibold leading-none'>
              Criar nova API Key
            </Dialog.Title>
            <Dialog.Description className='text-[14px] font-normal text-[oklch(0.556_0_0)]'>
              Dê um nome para identificar esta API key.
            </Dialog.Description>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className='space-y-4'>
            <div className='space-y-1.5'>
              <label className='text-[12px] font-medium text-[oklch(0.556_0_0)]'>
                Nome <span className='text-error-base'>*</span>
              </label>
              <input
                {...register('name')}
                placeholder='ex: Integração Zapier'
                className={INPUT_CLASSES}
                autoFocus
              />
              {errors.name && (
                <p className='text-[12px] text-error-base'>
                  {errors.name.message}
                </p>
              )}
            </div>

            <div className='flex items-center justify-end gap-2 pt-2'>
              <Button.Root
                variant='neutral'
                mode='stroke'
                onClick={() => handleOpenChange(false)}
                type='button'
              >
                Cancelar
              </Button.Root>
              <Button.Root
                variant='primary'
                mode='filled'
                type='submit'
                disabled={!isValid || create.isPending}
              >
                Criar
              </Button.Root>
            </div>
          </form>

          <Dialog.Close asChild>
            <button
              type='button'
              className='absolute right-4 top-4 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-[oklch(0.708_0.165_254.624)] focus:ring-offset-2 disabled:pointer-events-none'
            >
              <RiCloseLine className='size-4' />
              <span className='sr-only'>Fechar</span>
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
