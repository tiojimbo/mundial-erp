'use client';

import { RiKey2Line, RiAddLine } from '@remixicon/react';
import * as Button from '@/components/ui/button';

type Props = {
  onCreate: () => void;
};

export function ApiTokensEmptyState({ onCreate }: Props) {
  return (
    <div className='flex flex-col items-center justify-center rounded-2xl border border-dashed border-stroke-soft-200 py-16'>
      <div className='flex size-12 items-center justify-center rounded-full bg-bg-soft-200'>
        <RiKey2Line className='size-6 text-text-soft-400' />
      </div>
      <p className='mt-4 text-paragraph-sm text-text-sub-600'>
        Nenhuma API key criada
      </p>
      <Button.Root
        variant='primary'
        mode='stroke'
        size='small'
        className='mt-4'
        onClick={onCreate}
      >
        <Button.Icon as={RiAddLine} />
        Criar sua primeira API Key
      </Button.Root>
    </div>
  );
}
