'use client';

import { RiRefreshLine, RiErrorWarningLine } from '@remixicon/react';
import * as Button from '@/components/ui/button';

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className='flex min-h-screen items-center justify-center bg-bg-white-0 p-6'>
      <div className='flex max-w-md flex-col items-center text-center'>
        <div className='mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-error-lighter text-error-base'>
          <RiErrorWarningLine className='h-7 w-7' />
        </div>
        <h1 className='text-title-h5 text-text-strong-950'>
          Erro inesperado
        </h1>
        <p className='mt-2 text-paragraph-sm text-text-sub-600'>
          Ocorreu um erro ao carregar a pagina. Tente novamente ou entre em
          contato com o suporte.
        </p>
        <Button.Root
          variant='primary'
          mode='filled'
          size='medium'
          className='mt-6'
          onClick={reset}
        >
          <Button.Icon as={RiRefreshLine} />
          Tentar novamente
        </Button.Root>
      </div>
    </div>
  );
}
