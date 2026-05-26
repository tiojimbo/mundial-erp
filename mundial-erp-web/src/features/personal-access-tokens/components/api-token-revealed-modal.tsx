'use client';

import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import {
  RiAlertLine,
  RiCheckLine,
  RiCloseLine,
  RiFileCopyLine,
} from '@remixicon/react';
import * as Button from '@/components/ui/button';
import { useNotification } from '@/hooks/use-notification';
import type { ApiTokenCreated } from '../types/api-token.types';

type Props = {
  token: ApiTokenCreated | null;
  onClose: () => void;
};

export function ApiTokenRevealedModal({ token, onClose }: Props) {
  const { notification } = useNotification();
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    if (!token) return;
    try {
      await navigator.clipboard.writeText(token.token);
      setCopied(true);
      notification({
        title: 'Copiado',
        description: 'Token na área de transferência.',
        status: 'success',
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      notification({
        title: 'Erro',
        description: 'Não foi possível copiar.',
        status: 'error',
      });
    }
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) onClose();
  }

  return (
    <Dialog.Root open={!!token} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className='fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4' />
        <Dialog.Content className='shadow-lg fixed left-[50%] top-[50%] z-50 flex w-full max-w-lg translate-x-[-50%] translate-y-[-50%] flex-col gap-4 rounded-lg border border-[oklch(0.922_0_0)] bg-white p-6'>
          <div className='flex flex-col gap-2 text-center sm:text-left'>
            <Dialog.Title className='text-[18px] font-semibold leading-none'>
              API Key criada
            </Dialog.Title>
            <Dialog.Description className='text-[14px] font-normal text-[oklch(0.556_0_0)]'>
              Copie sua API key agora. Ela não será exibida novamente.
            </Dialog.Description>
          </div>

          <div className='space-y-4'>
            <div className='flex items-start gap-3 rounded-md border border-warning-base/30 bg-warning-light-50 p-3'>
              <RiAlertLine className='size-5 shrink-0 text-warning-base' />
              <p className='text-[12px] text-[oklch(0.556_0_0)]'>
                Guarde esta key em local seguro. Ela não poderá ser visualizada novamente.
              </p>
            </div>

            <div className='flex items-center gap-2 rounded-md border border-[oklch(0.922_0_0)] bg-[oklch(0.97_0_0)] p-3'>
              <code className='flex-1 overflow-x-auto text-[12px] text-text-strong-950'>
                {token?.token}
              </code>
              <Button.Root
                variant='neutral'
                mode='stroke'
                size='xsmall'
                onClick={handleCopy}
              >
                <Button.Icon as={copied ? RiCheckLine : RiFileCopyLine} />
                {copied ? 'Copiado' : 'Copiar'}
              </Button.Root>
            </div>

            <div className='flex items-center justify-end pt-2'>
              <Button.Root
                variant='primary'
                mode='filled'
                onClick={onClose}
              >
                Pronto
              </Button.Root>
            </div>
          </div>

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
