import { RiNotification3Line } from '@remixicon/react';
import type { InboxView } from '../types/notification.types';

type EmptyStateProps = { view: InboxView };

const MESSAGES: Record<InboxView, { title: string; subtitle?: string }> = {
  all: {
    title: 'Nenhuma notificação pendente',
    subtitle: 'Novas notificações aparecerão aqui.',
  },
  primary: {
    title: 'Nenhuma notificação pendente',
    subtitle: 'Novas notificações aparecerão aqui.',
  },
  other: {
    title: 'Nenhuma notificação pendente',
    subtitle: 'Novas notificações aparecerão aqui.',
  },
  later: { title: 'Nenhuma notificação adiada' },
  cleared: { title: 'Nenhuma notificação limpa' },
};

export function EmptyState({ view }: EmptyStateProps) {
  const { title, subtitle } = MESSAGES[view];

  return (
    <div className='flex flex-1 flex-col items-center justify-center py-16'>
      <div className='flex size-16 items-center justify-center rounded-full bg-bg-soft-200'>
        <RiNotification3Line className='size-6 text-text-sub-600' />
      </div>
      <p className='mt-4 text-sm font-medium text-muted-foreground'>{title}</p>
      {subtitle && (
        <p className='mt-1 text-sm font-normal text-muted-foreground'>{subtitle}</p>
      )}
    </div>
  );
}
