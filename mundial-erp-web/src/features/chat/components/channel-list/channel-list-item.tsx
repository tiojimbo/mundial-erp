'use client';

import { RiHashtag, RiLockLine } from '@remixicon/react';
import { useChatStore } from '@/stores/chat.store';
import type { Channel } from '../../types/chat.types';

type ChannelListItemProps = {
  channel: Channel;
};

const DEPT_BADGE_COLORS: Record<string, string> = {
  HU: 'bg-[#d97706]',
  FI: 'bg-[#ea580c]',
  CO: 'bg-[#ca8a04]',
  PR: 'bg-[#0d9488]',
  CM: 'bg-[#0d9488]',
  SI: 'bg-[#7c3aed]',
};

export function ChannelListItem({ channel }: ChannelListItemProps) {
  const activeChannelId = useChatStore((s) => s.activeChannelId);
  const setActiveChannel = useChatStore((s) => s.setActiveChannel);
  const unreadCount = useChatStore((s) => s.unreadCounts[channel.id] ?? 0);

  const isActive = activeChannelId === channel.id;
  const isDm = channel.type === 'DIRECT' || channel.type === 'GROUP_DM';

  return (
    <button
      onClick={() => setActiveChannel(channel.id)}
      className={`flex h-[28px] w-full items-center gap-2 rounded-lg px-2 text-left text-[14px] transition-colors ${
        isActive
          ? 'bg-[oklch(94%_0_0)] font-medium text-[oklch(14.5%_0_0)]'
          : 'text-[oklch(14.5%_0_0)] hover:bg-[oklch(94%_0_0)]'
      }`}
    >
      {isDm ? (
        <DmAvatar name={channel.name} />
      ) : (
        <ChannelIcon type={channel.type} name={channel.name} />
      )}

      <span className='min-w-0 flex-1 truncate'>
        {channel.name ?? 'DM'}
      </span>

      {unreadCount > 0 && (
        <span className='flex min-w-[18px] items-center justify-center rounded-full bg-[oklch(14.5%_0_0)] px-1 text-[10px] font-semibold text-white'>
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </button>
  );
}

function ChannelIcon({
  type,
  name,
}: {
  type: string;
  name: string | null;
}) {
  const abbr = name?.substring(0, 2).toUpperCase() ?? '';
  const colorClass = DEPT_BADGE_COLORS[abbr] ?? 'bg-gray-500';

  return (
    <span className='flex items-center gap-[2px]'>
      {type === 'PRIVATE' ? (
        <RiLockLine className='size-4 text-[oklch(55.6%_0_0)]' />
      ) : (
        <RiHashtag className='size-4 text-[oklch(55.6%_0_0)]' />
      )}
      <span
        className={`flex size-3 items-center justify-center rounded-[3px] text-[5px] font-semibold text-white ${colorClass}`}
      >
        {abbr}
      </span>
    </span>
  );
}

function DmAvatar({ name }: { name: string | null }) {
  const initials = (name ?? '??')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  return (
    <div className='flex size-6 items-center justify-center rounded-full bg-[#7c3aed] text-[9px] font-semibold text-white'>
      {initials}
    </div>
  );
}
