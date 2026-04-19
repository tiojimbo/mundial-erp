'use client';

import type { Notification, InboxView } from '../types/notification.types';
import { groupNotificationsByDate } from '../lib/date';
import { NotificationGroup } from './notification-group';

type NotificationListProps = {
  items: Notification[];
  isLoading: boolean;
  view: InboxView;
  onRead: (id: string) => void;
  onUnread: (id: string) => void;
  onClear: (id: string) => void;
  onNavigate: (url: string) => void;
};

export function NotificationList({
  items,
  isLoading,
  view,
  onRead,
  onUnread,
  onClear,
  onNavigate,
}: NotificationListProps) {
  if (isLoading) {
    return (
      <div className='space-y-1 p-2'>
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className='h-11 w-full animate-pulse rounded bg-muted'
          />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className='flex flex-1 flex-col items-center justify-center py-16'>
        <div className='flex h-16 w-16 items-center justify-center rounded-full bg-muted'>
          <svg
            className='h-6 w-6 text-muted-foreground'
            fill='none'
            viewBox='0 0 24 24'
            stroke='currentColor'
          >
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9'
            />
          </svg>
        </div>
        <p className='mt-4 text-label-sm text-muted-foreground'>
          {view === 'later'
            ? 'Nenhuma notificação adiada'
            : view === 'cleared'
              ? 'Nenhuma notificação limpa'
              : 'Nenhuma notificação pendente'}
        </p>
        {(view === 'all' || view === 'primary' || view === 'other') && (
          <p className='mt-1 text-paragraph-sm text-muted-foreground'>
            Novas notificações aparecerão aqui.
          </p>
        )}
      </div>
    );
  }

  const groups = groupNotificationsByDate(items);

  return (
    <ul role='list' className='divide-y-0'>
      {Array.from(groups.entries()).map(([group, groupItems]) => (
        <NotificationGroup
          key={group}
          group={group}
          items={groupItems}
          onRead={onRead}
          onUnread={onUnread}
          onClear={onClear}
          onNavigate={onNavigate}
        />
      ))}
    </ul>
  );
}
