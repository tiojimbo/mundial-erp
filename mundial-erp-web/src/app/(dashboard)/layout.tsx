'use client';

import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { ProcessContextBar } from '@/components/layout/process-context-bar';
import { ErrorBoundary } from '@/components/error-boundary';
import { GlobalScannerListener } from '@/components/global-scanner-listener';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className='flex h-screen bg-sidebar'>
      <GlobalScannerListener />
      <Sidebar />
      <div className='flex min-w-0 flex-1 flex-col gap-2 py-2 pl-1.5 pr-2'>
        <Header />
        <div
          className='flex min-h-0 flex-1 flex-col overflow-hidden rounded-[14px] bg-card'
          style={{
            boxShadow:
              '0 1px 3px 0 rgba(0,0,0,0.1), 0 1px 2px -1px rgba(0,0,0,0.1)',
          }}
        >
          <ProcessContextBar />
          <main className='flex-1 overflow-y-auto p-4 lg:p-6'>
            <ErrorBoundary>{children}</ErrorBoundary>
          </main>
        </div>
      </div>
    </div>
  );
}
