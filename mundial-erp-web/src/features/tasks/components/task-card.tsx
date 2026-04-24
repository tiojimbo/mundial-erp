'use client';

import Link from 'next/link';
import { format, isPast, isToday, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  RiCalendarLine,
  RiFlagLine,
  RiPriceTag3Line,
} from '@remixicon/react';
import { cn } from '@/lib/cn';
import * as Avatar from '@/components/ui/avatar';
import * as AvatarGroup from '@/components/ui/avatar-group';
import type { Task, TaskPriority } from '../types/task.types';

type TaskCardProps = {
  task: Task;
  onOpen?: (taskId: string) => void;
  className?: string;
  draggableHandleProps?: React.HTMLAttributes<HTMLDivElement>;
};

const PRIORITY_COLOR: Record<TaskPriority, string> = {
  URGENT: 'text-error-base',
  HIGH: 'text-warning-base',
  NORMAL: 'text-primary-base',
  LOW: 'text-text-sub-600',
  NONE: 'text-faded-base',
};

const PRIORITY_LABEL: Record<TaskPriority, string> = {
  URGENT: 'Urgente',
  HIGH: 'Alta',
  NORMAL: 'Normal',
  LOW: 'Baixa',
  NONE: 'Sem prioridade',
};

function formatDueDate(iso: string | null): {
  label: string;
  tone: 'overdue' | 'today' | 'future' | 'none';
} {
  if (!iso) return { label: 'Sem prazo', tone: 'none' };
  const date = parseISO(iso);
  if (Number.isNaN(date.getTime())) return { label: 'Sem prazo', tone: 'none' };
  if (isToday(date)) {
    return { label: 'Hoje', tone: 'today' };
  }
  if (isPast(date)) {
    return {
      label: format(date, "dd 'de' MMM", { locale: ptBR }),
      tone: 'overdue',
    };
  }
  return {
    label: format(date, "dd 'de' MMM", { locale: ptBR }),
    tone: 'future',
  };
}

export function TaskCard({
  task,
  onOpen,
  className,
  draggableHandleProps,
}: TaskCardProps): JSX.Element {
  const due = formatDueDate(task.dueDate);
  const visibleTags = task.tags.slice(0, 3);
  const extraTags = Math.max(0, task.tags.length - visibleTags.length);
  const statusColor = task.status?.color ?? '#CBD0D7';
  const priority = task.priority;

  const handleClick = (event: React.MouseEvent) => {
    if (!onOpen) return;
    if ((event.target as HTMLElement).closest('[data-task-card-stop]')) return;
    onOpen(task.id);
  };

  return (
    <article
      role="listitem"
      aria-label={`Tarefa ${task.title}`}
      className={cn(
        'group relative flex flex-col gap-2 rounded-lg border border-stroke-soft-200 bg-bg-white-0 p-3 text-left shadow-regular-xs transition-all duration-200',
        'hover:border-stroke-sub-300 hover:shadow-regular-sm',
        'focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-1',
        className,
      )}
      style={{ borderLeftColor: statusColor, borderLeftWidth: 3 }}
      onClick={handleClick}
      {...(draggableHandleProps ?? {})}
    >
      <Link
        href={`/tasks/${task.id}`}
        className="line-clamp-2 text-label-sm text-text-strong-950 outline-none hover:underline"
        onClick={(event) => {
          if (onOpen) {
            event.preventDefault();
            onOpen(task.id);
          }
        }}
      >
        {task.title}
      </Link>

      {visibleTags.length > 0 && (
        <ul
          className="flex flex-wrap items-center gap-1"
          aria-label="Tags da tarefa"
        >
          {visibleTags.map((tag) => (
            <li
              key={tag.id}
              className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-subheading-2xs text-text-sub-600"
              style={{
                backgroundColor: `${tag.color}1A`,
                color: tag.color,
              }}
            >
              <RiPriceTag3Line className="size-3" aria-hidden />
              <span>{tag.name}</span>
            </li>
          ))}
          {extraTags > 0 && (
            <li className="inline-flex items-center rounded-md bg-bg-weak-50 px-1.5 py-0.5 text-subheading-2xs text-text-sub-600">
              +{extraTags}
            </li>
          )}
        </ul>
      )}

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-subheading-2xs text-text-sub-600">
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5',
              due.tone === 'overdue' &&
                'bg-error-lighter text-error-base',
              due.tone === 'today' &&
                'bg-warning-lighter text-warning-base',
              due.tone === 'future' && 'bg-bg-weak-50',
              due.tone === 'none' && 'bg-bg-weak-50 text-faded-base',
            )}
          >
            <RiCalendarLine className="size-3" aria-hidden />
            <span>{due.label}</span>
          </span>
          {typeof task.points === 'number' && task.points > 0 && (
            <span className="inline-flex items-center rounded-md bg-bg-weak-50 px-1.5 py-0.5">
              {task.points} pts
            </span>
          )}
          <span
            className={cn(
              'inline-flex items-center gap-1',
              PRIORITY_COLOR[priority],
            )}
            aria-label={`Prioridade: ${PRIORITY_LABEL[priority]}`}
            title={PRIORITY_LABEL[priority]}
          >
            <RiFlagLine className="size-3" aria-hidden />
          </span>
        </div>

        {task.assignees.length > 0 && (
          <AvatarGroup.Root size="24">
            {task.assignees.slice(0, 3).map((assignee) => (
              <Avatar.Root key={assignee.userId} size="24">
                <span aria-hidden>
                  {assignee.userName?.slice(0, 1).toUpperCase() ?? '?'}
                </span>
              </Avatar.Root>
            ))}
            {task.assignees.length > 3 && (
              <AvatarGroup.Overflow>
                +{task.assignees.length - 3}
              </AvatarGroup.Overflow>
            )}
          </AvatarGroup.Root>
        )}
      </div>
    </article>
  );
}
