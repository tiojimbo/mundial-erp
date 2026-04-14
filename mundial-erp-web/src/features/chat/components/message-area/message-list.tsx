'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useMessages } from '../../hooks/use-messages';
import { MessageItem } from './message-item';
import type { Message } from '../../types/chat.types';
import { formatDate } from '@/lib/formatters';

type MessageListProps = {
  channelId: string;
};

export function MessageList({ channelId }: MessageListProps) {
  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useMessages(channelId);

  const scrollRef = useRef<HTMLDivElement>(null);
  const topSentinelRef = useRef<HTMLDivElement>(null);

  const messages: Message[] =
    data?.pages.flatMap((page) => page.data).reverse() ?? [];

  // Scroll to bottom on initial load and new messages
  useEffect(() => {
    if (scrollRef.current && !isFetchingNextPage) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [channelId, messages.length, isFetchingNextPage]);

  // Intersection observer for infinite scroll (load older messages on scroll up)
  useEffect(() => {
    const sentinel = topSentinelRef.current;
    if (!sentinel || !hasNextPage) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  // Group messages by date
  const groupedMessages = groupByDate(messages);

  if (isLoading) {
    return (
      <div className='flex flex-1 flex-col gap-4 overflow-y-auto p-4'>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className='flex gap-3'>
            <div className='size-8 animate-pulse rounded-full bg-bg-weak-50' />
            <div className='flex-1 space-y-2'>
              <div className='h-4 w-32 animate-pulse rounded bg-bg-weak-50' />
              <div className='h-4 w-64 animate-pulse rounded bg-bg-weak-50' />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className='flex flex-1 flex-col items-center justify-center gap-2 text-text-soft-400'>
        <p className='text-paragraph-sm'>Nenhuma mensagem ainda</p>
        <p className='text-paragraph-xs'>
          Seja o primeiro a enviar uma mensagem
        </p>
      </div>
    );
  }

  return (
    <div
      ref={scrollRef}
      className='flex flex-1 flex-col overflow-y-auto'
    >
      {/* Sentinel for loading older messages */}
      <div ref={topSentinelRef} />
      {isFetchingNextPage && (
        <div className='py-2 text-center text-paragraph-xs text-text-soft-400'>
          Carregando...
        </div>
      )}

      {groupedMessages.map(({ date, messages: dayMessages }) => (
        <div key={date}>
          {/* Date separator */}
          <div className='flex items-center gap-4 px-4 py-4'>
            <div className='h-px flex-1 bg-stroke-soft-200' />
            <span className='whitespace-nowrap text-label-xs font-medium text-text-soft-400'>
              {date}
            </span>
            <div className='h-px flex-1 bg-stroke-soft-200' />
          </div>

          {dayMessages.map((message) => (
            <MessageItem key={message.id} message={message} />
          ))}
        </div>
      ))}
    </div>
  );
}

function groupByDate(messages: Message[]) {
  const groups: Array<{ date: string; messages: Message[] }> = [];
  let currentDate = '';

  for (const message of messages) {
    const date = formatDate(message.createdAt);
    if (date !== currentDate) {
      currentDate = date;
      groups.push({ date, messages: [message] });
    } else {
      groups[groups.length - 1].messages.push(message);
    }
  }

  return groups;
}
