'use client';

import { SettingsSidebar } from '@/features/settings/components/settings-sidebar';

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className='flex h-screen bg-bg-white-0'>
      <SettingsSidebar />
      <main className='flex-1 overflow-y-auto px-8 py-6'>{children}</main>
    </div>
  );
}
