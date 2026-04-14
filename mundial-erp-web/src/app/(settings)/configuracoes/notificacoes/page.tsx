import { RiNotification3Line } from '@remixicon/react';

export default function NotificacoesPage() {
  return (
    <div className='flex flex-col items-center justify-center py-20'>
      <div className='flex size-12 items-center justify-center rounded-full bg-bg-soft-200'>
        <RiNotification3Line className='size-6 text-text-soft-400' />
      </div>
      <h1 className='mt-4 text-label-lg text-text-strong-950'>Notificações</h1>
      <p className='mt-1 text-paragraph-sm text-text-sub-600'>
        Em breve. Configure suas preferências de notificação aqui.
      </p>
    </div>
  );
}
