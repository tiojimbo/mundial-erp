import { RiFileTextLine } from '@remixicon/react';

export default function DocumentosPage() {
  return (
    <div className='flex flex-col items-center justify-center gap-4 py-20 text-center'>
      <div className='flex size-12 items-center justify-center rounded-xl bg-gray-100'>
        <RiFileTextLine className='size-6 text-gray-500' />
      </div>
      <div>
        <h1 className='text-lg font-semibold text-gray-900'>Documentos</h1>
        <p className='mt-1 text-sm text-gray-500'>
          Em breve: propostas, NF-e, etiquetas e relatórios em um só lugar.
        </p>
      </div>
    </div>
  );
}
