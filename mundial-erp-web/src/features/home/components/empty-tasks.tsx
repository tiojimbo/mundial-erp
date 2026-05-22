'use client';

import { RiSparklingLine, RiCheckLine } from '@remixicon/react';

export function EmptyTasks() {
  return (
    <div className='flex w-full flex-col items-center justify-center gap-6 py-24'>
      {/* Ícone com badge */}
      <div className='relative'>
        <div className='to-primary-alpha-10/50 flex size-20 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-alpha-10 ring-1 ring-primary-alpha-10'>
          <RiSparklingLine className='text-primary-base/60 size-9' />
        </div>
        <div className='bg-green-500/10 ring-green-500/20 absolute -bottom-1 -right-1 flex size-7 items-center justify-center rounded-full ring-1'>
          <RiCheckLine className='size-4 text-green-500' />
        </div>
      </div>

      {/* Textos */}
      <div className='flex flex-col items-center gap-1.5'>
        <h3 className='text-lg font-semibold text-foreground'>Tudo em dia!</h3>
        <p className='text-sm max-w-sm text-center leading-relaxed text-muted-foreground'>
          Nenhuma tarefa atribuída no momento. Aproveite o silêncio ou crie a
          próxima
        </p>
      </div>
    </div>
  );
}
