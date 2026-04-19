'use client';

import { useState, useCallback, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { RiInboxLine } from '@remixicon/react';

import { InboxTabs } from './inbox-tabs';
import { NotificationList } from './notification-list';
import {
  useNotifications,
  useMarkAsRead,
  useMarkAsUnread,
  useClearNotification,
} from '../hooks/use-notifications';

import type {
  InboxView,
  NotificationFilters,
} from '../types/notification.types';

export function InboxClient() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const initialView = (searchParams.get('view') as InboxView) || 'all';
  const [view, setView] = useState<InboxView>(initialView);
  const [filters, _setFilters] = useState<NotificationFilters>({});

  const { data, isLoading } = useNotifications(view);
  const markAsRead = useMarkAsRead();
  const markAsUnread = useMarkAsUnread();
  const clearNotification = useClearNotification();

  const handleViewChange = useCallback(
    (newView: InboxView) => {
      setView(newView);
      router.replace(`/caixa-de-entrada?view=${newView}`, { scroll: false });
    },
    [router],
  );

  const filteredItems = useMemo(() => {
    if (!data?.items) return [];
    let items = data.items;

    if (filters.types?.length) {
      items = items.filter((n) => filters.types!.includes(n.type));
    }
    if (filters.unreadOnly) {
      items = items.filter((n) => n.status === 'unread');
    }

    return items;
  }, [data?.items, filters]);

  return (
    <div className='flex h-full flex-col'>
      <header className='flex items-center gap-2 px-4 py-3'>
        <RiInboxLine className='h-4 w-4 text-muted-foreground' />
        <h1 className='text-paragraph-sm text-foreground'>
          Caixa de entrada
        </h1>
      </header>

      <InboxTabs
        view={view}
        counts={
          data?.counts ?? {
            all: 0,
            primary: 0,
            other: 0,
            later: 0,
            cleared: 0,
          }
        }
        onViewChange={handleViewChange}
      />

      <div
        role='tabpanel'
        id={`tabpanel-${view}`}
        className='flex-1 overflow-y-auto'
      >
        <NotificationList
          items={filteredItems}
          isLoading={isLoading}
          view={view}
          onRead={(id) => markAsRead.mutate(id)}
          onUnread={(id) => markAsUnread.mutate(id)}
          onClear={(id) => clearNotification.mutate(id)}
          onNavigate={(url) => router.push(url)}
        />
      </div>
    </div>
  );
}
