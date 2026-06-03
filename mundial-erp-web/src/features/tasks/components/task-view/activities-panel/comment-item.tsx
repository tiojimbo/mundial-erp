'use client';

import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useState } from 'react';

import { getAvatarUrl } from '@/lib/api';

import { sanitizeCommentHtml } from '../../../lib';
import type { TaskComment } from '../../../types/task.types';

import { CommentReactions } from './comment-reactions';

const AVATAR_COLORS = [
  'rgb(217, 119, 6)',
  'rgb(220, 38, 38)',
  'rgb(124, 58, 237)',
  'rgb(37, 99, 235)',
  'rgb(5, 150, 105)',
  'rgb(219, 39, 119)',
] as const;

function colorOf(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1)
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function isEmptyComment(html: string | null | undefined): boolean {
  if (!html) return true;
  return html.replace(/<[^>]+>/g, '').trim().length === 0;
}

function formatLong(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  try {
    return format(d, "d 'de' MMM yyyy 'às' HH:mm", { locale: ptBR });
  } catch {
    return d.toLocaleString('pt-BR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}

export type CommentItemProps = {
  comment: TaskComment;
  taskId: string;
};

export function CommentItem({ comment, taskId }: CommentItemProps) {
  const authorName =
    comment.author?.name || comment.authorName || comment.author?.email || '';
  const label = authorName || 'Usuário';
  const seed = comment.author?.id || comment.authorId || label;
  const hasBody = !isEmptyComment(comment.content);

  const avatarUrl = getAvatarUrl(comment.author?.avatar);
  const [avatarFailed, setAvatarFailed] = useState(false);
  const showImage = Boolean(avatarUrl) && !avatarFailed;

  return (
    <li className='space-y-2 rounded-[10px] border border-stroke-soft-200 bg-bg-white-0 p-3'>
      <div className='grid grid-cols-[20px_1fr_auto] items-start gap-2'>
        {showImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl as string}
            alt={label}
            className='size-5 rounded-[5px] object-cover'
            onError={() => setAvatarFailed(true)}
          />
        ) : (
          <span
            className='flex size-5 items-center justify-center rounded-[5px] text-[10px] font-medium leading-none text-static-white'
            style={{ backgroundColor: colorOf(seed) }}
            aria-hidden='true'
          >
            {initialsOf(label)}
          </span>
        )}
        <div className='flex min-w-0 flex-col'>
          <span className='text-label-xs font-medium text-text-strong-950'>
            {label}
          </span>
          <time
            dateTime={comment.createdAt}
            className='text-paragraph-xs text-text-soft-400'
          >
            {formatLong(comment.createdAt)}
          </time>
        </div>
        <div
          className='flex items-center'
          data-slot='comment-actions'
          aria-hidden='true'
        />
      </div>

      {hasBody ? (
        <div
          className='prose min-w-0 max-w-none break-words text-paragraph-sm leading-[21px] text-text-sub-600 [overflow-wrap:anywhere]'
          dangerouslySetInnerHTML={{
            __html: sanitizeCommentHtml(comment.content),
          }}
        />
      ) : null}

      <CommentReactions
        taskId={taskId}
        commentId={comment.id}
        reactions={comment.reactions ?? []}
      />
    </li>
  );
}
