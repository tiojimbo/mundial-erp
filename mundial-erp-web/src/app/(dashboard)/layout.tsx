'use client';

import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { ProcessContextBar } from '@/components/layout/process-context-bar';
import { ErrorBoundary } from '@/components/error-boundary';
import { GlobalScannerListener } from '@/components/global-scanner-listener';
import { GlobalShortcuts } from '@/features/tasks/components/global-shortcuts';
import { BulkActionsBar } from '@/features/tasks/components/bulk-actions-bar';
import { useNotificationsSocket } from '@/features/inbox/hooks/use-notifications-socket';
import { FavoritesTopBar } from '@/features/favorites/components/favorites-top-bar';
import { FavoritesBottomBar } from '@/features/favorites/components/favorites-bottom-bar';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useNotificationsSocket();

  return (
    <div className='flex h-screen bg-sidebar'>
      <GlobalScannerListener />
      <GlobalShortcuts />
      <Sidebar />
      <div className='flex min-w-0 flex-1 flex-col gap-2 py-2 pl-1.5 pr-2'>
        <Header />
        <FavoritesTopBar />
        <div
          className='flex min-h-0 flex-1 flex-col overflow-hidden rounded-[14px] bg-card'
          style={{
            boxShadow:
              '0 1px 3px 0 rgba(0,0,0,0.1), 0 1px 2px -1px rgba(0,0,0,0.1)',
          }}
        >
          <ProcessContextBar />
          <main className='flex min-h-0 flex-1 flex-col overflow-y-auto p-4 lg:p-6'>
            <ErrorBoundary>{children}</ErrorBoundary>
          </main>
          <FavoritesBottomBar />
        </div>
      </div>
      <BulkActionsBar />
    </div>
  );
}
