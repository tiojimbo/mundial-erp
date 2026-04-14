import Link from 'next/link';
import { RiArrowLeftLine, RiSearchLine } from '@remixicon/react';
import * as Button from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className='flex min-h-screen items-center justify-center bg-bg-white-0 p-6'>
      <div className='flex max-w-md flex-col items-center text-center'>
        <div className='mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-bg-weak-50 text-text-soft-400'>
          <RiSearchLine className='h-7 w-7' />
        </div>
        <h1 className='text-title-h4 text-text-strong-950'>
          Pagina nao encontrada
        </h1>
        <p className='mt-2 text-paragraph-sm text-text-sub-600'>
          A pagina que voce esta procurando nao existe ou foi movida.
        </p>
        <Button.Root
          asChild
          variant='primary'
          mode='filled'
          size='medium'
          className='mt-6'
        >
          <Link href='/inicio'>
            <Button.Icon as={RiArrowLeftLine} />
            Voltar ao inicio
          </Link>
        </Button.Root>
      </div>
    </div>
  );
}
