'use client';

import { useEffect, useRef } from 'react';
import { Cog, Hash, Pin, Search, Star, Users, Video } from 'lucide-react';
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

  const btnBase =
    "inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-md text-sm font-medium outline-none transition-all cursor-pointer disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50 focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive";
  const btnSm = `${btnBase} h-8 gap-1.5 px-3 has-[>svg]:px-2.5`;
  const iconBtn = `${btnBase} size-8 text-muted-foreground`;
  const iconBtnSm = `${btnBase} size-7 text-muted-foreground`;

  return (
    <div className='flex h-full flex-col'>
      {/* Header */}
      <div className='flex h-14 shrink-0 items-center justify-between rounded-xl border border-border bg-background px-4'>
        <div className='flex min-w-0 items-center gap-2'>
          <Hash
            className='size-4 shrink-0 text-muted-foreground'
            aria-hidden
          />
          <h2 className='truncate text-sm font-semibold'>
            {channel?.name ?? 'Canal'}
          </h2>
        </div>
        <div className='flex items-center gap-1'>
          <Tooltip.Root>
            <Tooltip.Trigger asChild>
              <button
                type='button'
                data-slot='button'
                className={btnSm}
                aria-label='Iniciar chamada'
              >
                <Video className='size-4' aria-hidden />
                <span className='ml-1 hidden md:inline'>Iniciar chamada</span>
              </button>
            </Tooltip.Trigger>
            <Tooltip.Content>Em breve</Tooltip.Content>
          </Tooltip.Root>

          <MembersPopover channelId={channelId}>
            <button
              type='button'
              data-slot='popover-trigger'
              className={`${btnSm} text-muted-foreground`}
              aria-haspopup='dialog'
            >
              <Users className='size-4' aria-hidden />
              {channel?.memberCount !== undefined ? (
                <span className='text-xs'>{channel.memberCount}</span>
              ) : null}
            </button>
          </MembersPopover>

          <Tooltip.Root>
            <Tooltip.Trigger asChild>
              <button
                type='button'
                data-slot='tooltip-trigger'
                className={iconBtn}
                aria-label='Buscar'
              >
                <Search className='size-4' aria-hidden />
              </button>
            </Tooltip.Trigger>
            <Tooltip.Content>Buscar</Tooltip.Content>
          </Tooltip.Root>

          <Tooltip.Root>
            <Tooltip.Trigger asChild>
              <button
                type='button'
                data-slot='tooltip-trigger'
                className={iconBtn}
                aria-label='Fixar'
              >
                <Pin className='size-4' aria-hidden />
              </button>
            </Tooltip.Trigger>
            <Tooltip.Content>Fixar</Tooltip.Content>
          </Tooltip.Root>

          <Tooltip.Root>
            <Tooltip.Trigger asChild>
              <button
                type='button'
                data-slot='tooltip-trigger'
                className={iconBtnSm}
                aria-label='Favoritar canal'
                aria-haspopup='dialog'
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
                data-slot='tooltip-trigger'
                className={iconBtn}
                aria-label='Configurações do canal'
              >
                <Cog className='size-4' aria-hidden />
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
