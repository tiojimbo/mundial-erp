'use client';

import { useMemo, useState } from 'react';
import { cn } from '@/lib/cn';
import { useToggleReaction } from '../../../hooks/use-toggle-reaction';
import { useAuthStore } from '@/stores/auth.store';
import type { CommentReaction } from '../../../types/task.types';

const DEFAULT_PALETTE = ['👍', '❤️', '😄', '🎉', '😢', '🤔'] as const;

type GroupedReaction = {
  emoji: string;
  count: number;
  reacted: boolean;
};

function groupByEmoji(
  reactions: CommentReaction[],
  userId: string,
): GroupedReaction[] {
  const map = new Map<string, GroupedReaction>();
  for (const r of reactions) {
    const existing = map.get(r.emoji);
    if (existing) {
      existing.count += 1;
      if (r.userId === userId) existing.reacted = true;
    } else {
      map.set(r.emoji, {
        emoji: r.emoji,
        count: 1,
        reacted: r.userId === userId,
      });
    }
  }
  return Array.from(map.values());
}

export type CommentReactionsProps = {
  taskId: string;
  commentId: string;
  reactions: CommentReaction[];
};

export function CommentReactions({
  taskId,
  commentId,
  reactions,
}: CommentReactionsProps) {
  const userId = useAuthStore((s) => s.user?.id ?? '');
  const toggle = useToggleReaction();
  const [pickerOpen, setPickerOpen] = useState(false);

  const grouped = useMemo(
    () => groupByEmoji(reactions, userId),
    [reactions, userId],
  );

  const handleToggle = (emoji: string) => {
    if (toggle.isPending) return;
    toggle.mutate({ taskId, commentId, emoji });
    setPickerOpen(false);
  };

  return (
    <div className='mt-1 flex flex-wrap items-center gap-1'>
      {grouped.map((g) => (
        <button
          key={g.emoji}
          type='button'
          onClick={() => handleToggle(g.emoji)}
          disabled={toggle.isPending}
          aria-pressed={g.reacted}
          className={cn(
            'inline-flex h-[23px] items-center gap-1 rounded-full border px-1.5 py-0.5 text-[11px] leading-none transition-colors',
            g.reacted
              ? 'border-stroke-strong-950 bg-bg-strong-950 text-static-white'
              : 'border-stroke-soft-200 bg-bg-white-0 text-text-sub-600 hover:bg-bg-weak-50',
            toggle.isPending && 'opacity-60',
          )}
        >
          <span aria-hidden>{g.emoji}</span>
          <span>{g.count}</span>
        </button>
      ))}

      <div className='relative'>
        <button
          type='button'
          onClick={() => setPickerOpen((v) => !v)}
          className='inline-flex h-[23px] items-center gap-1 rounded-full border border-dashed border-stroke-soft-200 px-1.5 py-0.5 text-[11px] leading-none text-text-sub-600 hover:bg-bg-weak-50'
          aria-label='Adicionar reacao'
        >
          + 😀
        </button>
        {pickerOpen && (
          <div
            role='menu'
            className='absolute left-0 top-full z-10 mt-1 flex gap-1 rounded-md border border-stroke-soft-200 bg-bg-white-0 p-1 shadow-regular-md'
          >
            {DEFAULT_PALETTE.map((emoji) => (
              <button
                key={emoji}
                type='button'
                role='menuitem'
                onClick={() => handleToggle(emoji)}
                disabled={toggle.isPending}
                className='h-7 w-7 rounded text-[14px] hover:bg-bg-weak-50'
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
