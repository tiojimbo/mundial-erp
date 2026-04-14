'use client';

import { RiCloseLine, RiReplyLine } from '@remixicon/react';
import { useChatStore } from '@/stores/chat.store';
import { useMessage, useReplies } from '../../hooks/use-messages';
import { MessageItem } from '../message-area/message-item';
import { MessageComposer } from '../message-area/message-composer';
import type { Message } from '../../types/chat.types';

type ThreadPanelProps = {
  messageId: string;
};

export function ThreadPanel({ messageId }: ThreadPanelProps) {
  const closeThread = useChatStore((s) => s.closeThread);
  const activeChannelId = useChatStore((s) => s.activeChannelId);

  const { data: parentMessage, isLoading: isLoadingParent } = useMessage(
    activeChannelId ?? '',
    messageId,
  );
  const { data, isLoading: isLoadingReplies } = useReplies(messageId);

  const replies: Message[] =
    data?.pages.flatMap((page) => page.data) ?? [];

  const authorName = parentMessage?.author.name ?? 'Conversa';
  const replyCount = replies.length;

  return (
    <div className='flex h-full flex-col bg-bg-white-0'>
      {/* Header */}
      <div className='flex items-center justify-between border-b border-stroke-soft-200 px-4 py-3'>
        <div className='flex items-center gap-2'>
          <RiReplyLine className='size-4 text-text-soft-400' />
          <h3 className='text-[14px] font-semibold text-text-strong-950'>
            {authorName} — Conversa
          </h3>
        </div>
        <button
          type='button'
          onClick={closeThread}
          className='flex size-8 items-center justify-center rounded-lg text-text-soft-400 transition-colors hover:bg-bg-weak-50'
        >
          <RiCloseLine className='size-5' />
        </button>
      </div>

      {/* Conteudo scrollavel */}
      <div className='flex-1 overflow-y-auto'>
        {/* Mensagem original */}
        {isLoadingParent ? (
          <div className='flex gap-3 px-4 py-4'>
            <div className='size-8 animate-pulse rounded-full bg-bg-weak-50' />
            <div className='flex-1 space-y-2'>
              <div className='h-4 w-32 animate-pulse rounded bg-bg-weak-50' />
              <div className='h-4 w-64 animate-pulse rounded bg-bg-weak-50' />
            </div>
          </div>
        ) : parentMessage ? (
          <div className='border-b border-stroke-soft-200'>
            <MessageItem message={parentMessage} hideThreadPreview />
          </div>
        ) : null}

        {/* Separador de respostas */}
        <div className='flex items-center gap-3 px-4 py-3'>
          <div className='h-px flex-1 bg-stroke-soft-200' />
          <span className='whitespace-nowrap text-[12px] font-medium text-text-soft-400'>
            {isLoadingReplies
              ? 'Carregando...'
              : replyCount === 0
                ? 'Nenhuma resposta'
                : `${replyCount} Responder`}
          </span>
          <div className='h-px flex-1 bg-stroke-soft-200' />
        </div>

        {/* Lista de replies */}
        {isLoadingReplies ? (
          <div className='space-y-3 px-4'>
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className='flex gap-3'>
                <div className='size-8 animate-pulse rounded-full bg-bg-weak-50' />
                <div className='flex-1 space-y-2'>
                  <div className='h-3 w-24 animate-pulse rounded bg-bg-weak-50' />
                  <div className='h-3 w-48 animate-pulse rounded bg-bg-weak-50' />
                </div>
              </div>
            ))}
          </div>
        ) : (
          replies.map((reply) => (
            <MessageItem key={reply.id} message={reply} />
          ))
        )}
      </div>

      {/* Composer de resposta */}
      {activeChannelId && (
        <MessageComposer
          channelId={activeChannelId}
          parentMessageId={messageId}
        />
      )}
    </div>
  );
}
