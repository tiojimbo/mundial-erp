'use client';

import { RiRefreshLine, RiErrorWarningLine } from '@remixicon/react';
import * as Button from '@/components/ui/button';

export default function DashboardError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className='flex flex-col items-center justify-center py-16 text-center'>
      <div className='mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-error-lighter text-error-base'>
        <RiErrorWarningLine className='h-6 w-6' />
      </div>
      <h2 className='text-title-h5 text-text-strong-950'>Algo deu errado</h2>
      <p className='mt-2 max-w-sm text-paragraph-sm text-text-sub-600'>
        Ocorreu um erro ao carregar esta secao. Tente novamente.
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
  );
}
