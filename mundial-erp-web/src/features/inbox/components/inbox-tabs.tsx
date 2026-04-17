import {
  RiInboxLine,
  RiChat1Line,
  RiArrowLeftRightLine,
  RiTimeLine,
  RiDeleteBinLine,
} from '@remixicon/react';

import type {
  InboxView,
  NotificationCounts,
} from '../types/notification.types';

type TabConfig = {
  key: InboxView;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  showBadge: boolean;
};

const TABS: TabConfig[] = [
  { key: 'all', label: 'All', icon: RiInboxLine, showBadge: true },
  { key: 'primary', label: 'Primary', icon: RiChat1Line, showBadge: true },
  {
    key: 'other',
    label: 'Other',
    icon: RiArrowLeftRightLine,
    showBadge: true,
  },
  { key: 'later', label: 'Later', icon: RiTimeLine, showBadge: true },
  {
    key: 'cleared',
    label: 'Cleared',
    icon: RiDeleteBinLine,
    showBadge: false,
  },
];

type InboxTabsProps = {
  view: InboxView;
  counts: NotificationCounts;
  onViewChange: (view: InboxView) => void;
};

export function InboxTabs({ view, counts, onViewChange }: InboxTabsProps) {
  return (
    <div role='tablist' className='flex items-center gap-1 border-b px-4'>
      {TABS.map((tab) => {
        const isActive = view === tab.key;
        const count = counts[tab.key];
        const Icon = tab.icon;

        return (
          <button
            key={tab.key}
            role='tab'
            aria-selected={isActive}
            aria-controls={`tabpanel-${tab.key}`}
            onClick={() => onViewChange(tab.key)}
            className={`flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium transition-colors ${
              isActive
                ? 'border-b-2 border-[oklch(14.5%_0_0)] text-[oklch(14.5%_0_0)]'
                : 'text-[oklch(55.6%_0_0)] hover:text-[oklch(14.5%_0_0)]'
            }`}
          >
            <Icon className='size-4' />
            {tab.label}
            {tab.showBadge && count > 0 && (
              <span className='flex h-5 min-w-5 items-center justify-center rounded-full bg-[oklch(70%_0.15_350)] px-1.5 text-xs font-medium text-white'>
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
