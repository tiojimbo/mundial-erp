'use client';

import { useEffect, useRef } from 'react';
import {
  RiSearchLine,
  RiPushpinLine,
  RiHashtag,
  RiTeamLine,
} from '@remixicon/react';
import { useChannel, useMarkAsRead } from '../../hooks/use-channels';
import { useChatStore } from '@/stores/chat.store';
import { MessageList } from './message-list';
import { MessageComposer } from './message-composer';
import { TypingIndicator } from './typing-indicator';
import { MembersPopover } from '../members/members-popover';

type MessageAreaProps = {
  channelId: string;
};

export function MessageArea({ channelId }: MessageAreaProps) {
  const { data: channel } = useChannel(channelId);
  const { mutate: markAsRead } = useMarkAsRead(channelId);
  const clearUnread = useChatStore((s) => s.clearUnread);
  const hasMarkedRef = useRef<string | null>(null);

  useEffect(() => {
    if (hasMarkedRef.current === channelId) return;
    hasMarkedRef.current = channelId;
    markAsRead();
    clearUnread(channelId);
  }, [channelId]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className='flex h-full flex-col'>
      {/* Header */}
      <div className='flex items-center justify-between border-b border-stroke-soft-200 px-4 py-3'>
        <div className='flex items-center gap-3'>
          <div className='flex items-center gap-2'>
            <RiHashtag className='size-4 text-text-soft-400' />
            <h2 className='text-label-md font-semibold text-text-strong-950'>
              {channel?.name ?? 'Canal'}
            </h2>
          </div>
          {channel?.memberCount !== undefined && (
            <span className='flex items-center gap-1 text-paragraph-xs text-text-soft-400'>
              <RiTeamLine className='size-3.5' />
              {channel.memberCount}
            </span>
          )}
        </div>
        <div className='flex items-center gap-1'>
          <button className='flex size-8 items-center justify-center rounded-lg text-text-soft-400 transition-colors hover:bg-bg-weak-50'>
            <RiSearchLine className='size-4' />
          </button>
          <MembersPopover channelId={channelId}>
            <button
              type='button'
              className='flex size-8 items-center justify-center rounded-lg text-text-soft-400 transition-colors hover:bg-bg-weak-50'
            >
              <RiTeamLine className='size-4' />
            </button>
          </MembersPopover>
          <button className='flex size-8 items-center justify-center rounded-lg text-text-soft-400 transition-colors hover:bg-bg-weak-50'>
            <RiPushpinLine className='size-4' />
          </button>
        </div>
      </div>

      {/* Messages */}
      <MessageList channelId={channelId} />

      {/* Typing indicator */}
      <TypingIndicator channelId={channelId} />

      {/* Composer */}
      <MessageComposer channelId={channelId} />
    </div>
  );
}
