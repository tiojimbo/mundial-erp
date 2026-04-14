'use client';

import { useChatStore } from '@/stores/chat.store';
import { MessageArea } from './message-area/message-area';
import { ThreadPanel } from './thread-panel/thread-panel';
import { useChatSocket } from '../hooks/use-chat-socket';

export function ChatLayout() {
  useChatSocket();

  const activeChannelId = useChatStore((s) => s.activeChannelId);
  const activeThreadMessageId = useChatStore((s) => s.activeThreadMessageId);

  return (
    <div className='flex h-full overflow-hidden'>
      {/* Canal principal — ocupa espaco disponivel, encolhe quando thread abre */}
      <div className='flex min-w-0 flex-1 flex-col'>
        {activeChannelId ? (
          <MessageArea channelId={activeChannelId} />
        ) : (
          <div className='flex flex-1 flex-col items-center justify-center gap-2'>
            <div className='flex size-16 items-center justify-center rounded-2xl bg-[oklch(97%_0_0)]'>
              <svg
                width='24'
                height='24'
                viewBox='0 0 24 24'
                fill='none'
                stroke='oklch(55.6% 0 0)'
                strokeWidth='2'
              >
                <path d='M4 9h16' />
                <path d='M4 15h16' />
                <path d='M10 3 8 21' />
                <path d='M16 3 14 21' />
              </svg>
            </div>
            <h3 className='text-[18px] font-semibold text-[oklch(14.5%_0_0)]'>
              Selecione um canal
            </h3>
            <p className='text-[14px] text-[oklch(55.6%_0_0)]'>
              Escolha um canal ou DM no sidebar para iniciar uma conversa
            </p>
          </div>
        )}
      </div>

      {/* Thread panel — desliza da direita, 400px */}
      {activeThreadMessageId && (
        <div className='flex w-[400px] min-w-[400px] flex-col border-l border-stroke-soft-200 animate-in slide-in-from-right duration-200'>
          <ThreadPanel messageId={activeThreadMessageId} />
        </div>
      )}
    </div>
  );
}
