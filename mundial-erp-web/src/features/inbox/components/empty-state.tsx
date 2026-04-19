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
      <div className='flex h-16 w-16 items-center justify-center rounded-full bg-muted'>
        <RiNotification3Line className='h-6 w-6 text-muted-foreground' />
      </div>
      <p className='mt-4 text-label-sm text-muted-foreground'>{title}</p>
      {subtitle && (
        <p className='mt-1 text-paragraph-sm text-muted-foreground'>{subtitle}</p>
      )}
    </div>
  );
}
