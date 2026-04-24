'use client';

// TODO Sprint 5.1: hidratar `lookups` via hook `useTaskLookups(taskId)` quando
// backend expor bundle `/tasks/:id/lookups` (users/statuses/tags do workspace).
// Ate la, o pai passa `lookups` vazio e o formatter cai nos fallbacks (ids).

import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import {
  formatActivity,
  type ActivityLookups,
} from '../../../lib/format-activity';
import type { TaskActivity } from '../../../types/task.types';

/**
 * Sprint 5 (TSK-160) — Item individual do feed.
 * tasks.md §5.2 — dot/icon + <strong>actor</strong> action text-[11]
 * + <time> text-[10]. Fade+translateY(-4px) 150ms em novos.
 */

export type ActivityItemProps = {
  activity: TaskActivity;
  isNew?: boolean;
  lookups?: ActivityLookups;
};

const EMPTY_LOOKUPS: ActivityLookups = {
  users: {},
  statuses: {},
  tags: {},
};

function formatRelative(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return iso;
  }
  try {
    return format(d, "d 'de' MMM 'as' HH:mm", { locale: ptBR });
  } catch {
    return d.toLocaleString('pt-BR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}

export function ActivityItem({
  activity,
  isNew = false,
  lookups = EMPTY_LOOKUPS,
}: ActivityItemProps) {
  const { text, icon: Icon } = formatActivity(activity, lookups);

  return (
    <li
      className={`flex items-start justify-between gap-3 ${isNew ? 'animate-[fade-slide-in_150ms_cubic-bezier(.4,0,.2,1)]' : ''}`}
      style={
        isNew
          ? {
              animation: 'fade-slide-in 150ms cubic-bezier(.4,0,.2,1)',
            }
          : undefined
      }
    >
      <div className='flex items-start gap-2'>
        {Icon ? (
          <Icon
            className='mt-1 size-3 text-muted-foreground/60'
            aria-hidden='true'
          />
        ) : (
          <span
            className='mt-[6px] h-1.5 w-1.5 rounded-full bg-muted-foreground/40'
            aria-hidden='true'
          />
        )}
        <span className='text-[11px] leading-relaxed text-muted-foreground'>
          {text}
        </span>
      </div>
      <time
        dateTime={activity.createdAt}
        className='whitespace-nowrap text-[10px] text-muted-foreground/60'
      >
        {formatRelative(activity.createdAt)}
      </time>
    </li>
  );
}
