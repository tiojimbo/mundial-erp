import { RiInboxLine } from '@remixicon/react';

export default function CaixaDeEntradaPage() {
  return (
    <div className='flex flex-col items-center justify-center gap-4 py-20 text-center'>
      <div className='flex size-12 items-center justify-center rounded-xl bg-gray-100'>
        <RiInboxLine className='size-6 text-gray-500' />
      </div>
      <div>
        <h1 className='text-lg font-semibold text-gray-900'>
          Caixa de Entrada
        </h1>
        <p className='mt-1 text-sm text-gray-500'>
          Em breve: notificações e mensagens em um só lugar.
        </p>
      </div>
    </div>
  );
}
