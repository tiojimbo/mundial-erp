'use client';

import { useEffect, useRef } from 'react';
import {
  Hash,
  Pin,
  Search,
  Settings,
  Star,
  Users,
  Video,
} from 'lucide-react';
import * as Tooltip from '@/components/ui/tooltip';
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

  const iconBtn =
    'inline-flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors outline-none hover:bg-accent hover:text-accent-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50';

  return (
    <div className='flex h-full flex-col'>
      {/* Header */}
      <div className='flex h-14 shrink-0 items-center justify-between gap-3 rounded-xl border border-border bg-background px-4'>
        <div className='flex min-w-0 flex-1 items-center gap-2'>
          <Hash
            className='size-4 shrink-0 text-muted-foreground'
            aria-hidden
          />
          <h2 className='truncate text-sm font-semibold text-foreground'>
            {channel?.name ?? 'Canal'}
          </h2>
        </div>
        <div className='flex shrink-0 items-center gap-1'>
          <Tooltip.Root>
            <Tooltip.Trigger asChild>
              <button
                type='button'
                className='inline-flex h-8 items-center justify-center gap-1.5 rounded-md px-3 text-sm font-medium text-foreground transition-colors outline-none hover:bg-accent hover:text-accent-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50'
                aria-label='Iniciar chamada'
              >
                <Video className='size-4 shrink-0' aria-hidden />
                <span className='ml-1 hidden md:inline'>Iniciar chamada</span>
              </button>
            </Tooltip.Trigger>
            <Tooltip.Content>Em breve</Tooltip.Content>
          </Tooltip.Root>

          <MembersPopover channelId={channelId}>
            <button
              type='button'
              className='inline-flex h-8 items-center justify-center gap-1.5 rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors outline-none hover:bg-accent hover:text-accent-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50'
              aria-haspopup='dialog'
            >
              <Users className='size-4 shrink-0' aria-hidden />
              {channel?.memberCount !== undefined ? (
                <span className='text-xs tabular-nums'>{channel.memberCount}</span>
              ) : null}
            </button>
          </MembersPopover>

          <Tooltip.Root>
            <Tooltip.Trigger asChild>
              <button type='button' className={iconBtn} aria-label='Buscar'>
                <Search className='size-4' aria-hidden />
              </button>
            </Tooltip.Trigger>
            <Tooltip.Content>Buscar</Tooltip.Content>
          </Tooltip.Root>

          <Tooltip.Root>
            <Tooltip.Trigger asChild>
              <button type='button' className={iconBtn} aria-label='Fixar'>
                <Pin className='size-4' aria-hidden />
              </button>
            </Tooltip.Trigger>
            <Tooltip.Content>Fixar</Tooltip.Content>
          </Tooltip.Root>

          <Tooltip.Root>
            <Tooltip.Trigger asChild>
              <button
                type='button'
                className='inline-flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors outline-none hover:bg-accent hover:text-accent-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50'
                aria-label='Favoritar canal'
              >
                <Star className='size-3.5' aria-hidden />
              </button>
            </Tooltip.Trigger>
            <Tooltip.Content>Em breve</Tooltip.Content>
          </Tooltip.Root>

          <Tooltip.Root>
            <Tooltip.Trigger asChild>
              <button
                type='button'
                className={iconBtn}
                aria-label='Configurações do canal'
              >
                <Settings className='size-4' aria-hidden />
              </button>
            </Tooltip.Trigger>
            <Tooltip.Content>Em breve</Tooltip.Content>
          </Tooltip.Root>
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
