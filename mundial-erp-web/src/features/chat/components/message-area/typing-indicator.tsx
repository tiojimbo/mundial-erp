'use client';

import { useChatStore } from '@/stores/chat.store';

type TypingIndicatorProps = {
  channelId: string;
};

const EMPTY_ARRAY: never[] = [];

export function TypingIndicator({ channelId }: TypingIndicatorProps) {
  const typingUsers = useChatStore(
    (s) => s.typingUsers[channelId] ?? EMPTY_ARRAY,
  );

  if (typingUsers.length === 0) return null;

  const text =
    typingUsers.length === 1
      ? 'Alguem esta digitando'
      : `${typingUsers.length} pessoas estao digitando`;

  return (
    <div className='px-4 py-1'>
      <span className='text-paragraph-xs text-text-soft-400'>
        {text}...
      </span>
    </div>
  );
}
