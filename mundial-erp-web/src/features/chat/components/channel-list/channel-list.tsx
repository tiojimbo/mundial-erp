'use client';

import { useState } from 'react';
import {
  RiHashtag,
  RiAddLine,
  RiSearchLine,
} from '@remixicon/react';
import { useChannels } from '../../hooks/use-channels';
import { ChannelListItem } from './channel-list-item';

export function ChannelList() {
  const [search, setSearch] = useState('');
  const { data, isLoading } = useChannels({
    search: search || undefined,
    isFollower: true,
  });

  const channels = data?.pages.flatMap((page) => page.data) ?? [];
  const channelItems = channels.filter((c) => c.type === 'PUBLIC' || c.type === 'PRIVATE');
  const dmItems = channels.filter((c) => c.type === 'DIRECT' || c.type === 'GROUP_DM');

  return (
    <div className='flex h-full flex-col'>
      {/* Search */}
      <div className='p-3'>
        <div className='flex items-center gap-2 rounded-lg border border-[oklch(92.2%_0_0)] bg-[oklch(97%_0_0_/_0.4)] px-3 py-1.5 transition-colors focus-within:border-[oklch(70.8%_0_0)]'>
          <RiSearchLine className='size-4 text-[oklch(55.6%_0_0)] opacity-50' />
          <input
            type='text'
            placeholder='Buscar...'
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className='flex-1 bg-transparent text-[14px] text-[oklch(14.5%_0_0)] outline-none placeholder:text-[oklch(55.6%_0_0)]'
          />
        </div>
      </div>

      {/* Scrollable content */}
      <div className='flex-1 overflow-y-auto px-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[oklch(80%_0_0)] [&::-webkit-scrollbar]:w-1'>
        {/* Channels */}
        <SectionHeader title='Channels' />
        {isLoading ? (
          <LoadingSkeleton />
        ) : (
          <>
            {channelItems.map((channel) => (
              <ChannelListItem key={channel.id} channel={channel} />
            ))}
            <AddButton label='Add Channel' />
          </>
        )}

        {/* Direct Messages */}
        <SectionHeader title='Direct Messages' />
        {isLoading ? (
          <LoadingSkeleton />
        ) : (
          <>
            {dmItems.map((channel) => (
              <ChannelListItem key={channel.id} channel={channel} />
            ))}
            <AddButton label='New message' />
          </>
        )}
      </div>
    </div>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <div className='flex items-center justify-between px-2 py-1'>
      <span className='text-[12px] font-medium tracking-[-0.132px] text-[oklch(14.5%_0_0_/_0.7)]'>
        {title}
      </span>
      <button className='flex size-5 items-center justify-center rounded text-[oklch(55.6%_0_0)] transition-colors hover:bg-[oklch(94%_0_0)]'>
        <RiAddLine className='size-3.5' />
      </button>
    </div>
  );
}

function AddButton({ label }: { label: string }) {
  return (
    <button className='flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-[14px] text-[oklch(55.6%_0_0)] transition-colors hover:bg-[oklch(94%_0_0)] hover:text-[oklch(14.5%_0_0)]'>
      <RiAddLine className='size-4' />
      {label}
    </button>
  );
}

function LoadingSkeleton() {
  return (
    <div className='space-y-1 px-2'>
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className='h-7 animate-pulse rounded-lg bg-[oklch(97%_0_0)]'
        />
      ))}
    </div>
  );
}
