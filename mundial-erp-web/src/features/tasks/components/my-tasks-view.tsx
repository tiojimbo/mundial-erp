'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import {
  addDays,
  endOfDay,
  isWithinInterval,
  parseISO,
  startOfDay,
} from 'date-fns';
import {
  RiAlertLine,
  RiCalendar2Line,
  RiCalendarCheckLine,
  RiIndeterminateCircleLine,
} from '@remixicon/react';
import { useAuthStore } from '@/stores/auth.store';
import { useInfiniteTasks } from '../hooks/use-infinite-tasks';
import type { Task } from '../types/task.types';
import { TaskCard } from './task-card';

type Section = {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  tasks: Task[];
};

function groupByDueDate(tasks: Task[]): Section[] {
  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const weekEnd = endOfDay(addDays(now, 7));

  const overdue: Task[] = [];
  const today: Task[] = [];
  const thisWeek: Task[] = [];
  const backlog: Task[] = [];

  for (const task of tasks) {
    if (!task.dueDate) {
      backlog.push(task);
      continue;
    }
    const dueDate = parseISO(task.dueDate);
    if (Number.isNaN(dueDate.getTime())) {
      backlog.push(task);
      continue;
    }
    if (dueDate < todayStart) {
      overdue.push(task);
      continue;
    }
    if (isWithinInterval(dueDate, { start: todayStart, end: todayEnd })) {
      today.push(task);
      continue;
    }
    if (isWithinInterval(dueDate, { start: todayEnd, end: weekEnd })) {
      thisWeek.push(task);
      continue;
    }
    backlog.push(task);
  }

  return [
    { id: 'overdue', title: 'Atrasadas', icon: RiAlertLine, tasks: overdue },
    {
      id: 'today',
      title: 'Hoje',
      icon: RiCalendarCheckLine,
      tasks: today,
    },
    {
      id: 'this-week',
      title: 'Esta semana',
      icon: RiCalendar2Line,
      tasks: thisWeek,
    },
    {
      id: 'backlog',
      title: 'Backlog',
      icon: RiIndeterminateCircleLine,
      tasks: backlog,
    },
  ];
}

/**
 * Redesenho de `/tasks` (TSK-705) usando contrato legado de `/my-tasks`:
 * filtro `assigneeIds = [currentUserId]`.
 *
 * Secoes: Hoje, Esta semana, Atrasadas, Backlog (agrupamento por `dueDate`).
 */
export function MyTasksView(): JSX.Element {
  const user = useAuthStore((state) => state.user);
  const assigneeIds = user?.id ? [user.id] : undefined;

  const query = useInfiniteTasks(
    assigneeIds ? { assigneeIds, includeClosed: false } : undefined,
  );

  const tasks = useMemo<Task[]>(
    () => query.data?.pages.flatMap((p) => p.data) ?? [],
    [query.data],
  );

  const sections = useMemo(() => groupByDueDate(tasks), [tasks]);

  if (!user) {
    return (
      <div className="rounded-lg border border-dashed border-stroke-soft-200 p-6 text-center text-paragraph-sm text-text-sub-600">
        Faca login para ver suas tarefas.
      </div>
    );
  }

  if (query.isLoading) {
    return (
      <div
        className="flex flex-col gap-3"
        role="status"
        aria-busy="true"
        aria-live="polite"
      >
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-32 animate-pulse rounded-lg bg-bg-weak-50" />
        ))}
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-stroke-soft-200 p-8 text-center text-paragraph-sm text-text-sub-600">
        Nenhuma tarefa atribuida a voce agora.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {sections.map((section) => (
        <section key={section.id} aria-labelledby={`my-tasks-${section.id}`}>
          <header className="mb-2 flex items-center gap-2">
            <section.icon className="size-4 text-text-sub-600" />
            <h2
              id={`my-tasks-${section.id}`}
              className="text-label-md text-text-strong-950"
            >
              {section.title}
            </h2>
            <span
              className="text-subheading-2xs text-text-sub-600"
              aria-label={`${section.tasks.length} tarefas`}
            >
              {section.tasks.length}
            </span>
          </header>
          {section.tasks.length === 0 ? (
            <p className="rounded-md border border-dashed border-stroke-soft-200 p-4 text-paragraph-sm text-text-sub-600">
              Nada aqui.
            </p>
          ) : (
            <ul
              role="list"
              aria-label={section.title}
              className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3"
            >
              {section.tasks.map((task) => (
                <TaskCard key={task.id} task={task} />
              ))}
            </ul>
          )}
        </section>
      ))}

      {query.hasNextPage && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => query.fetchNextPage()}
            className="inline-flex h-9 items-center gap-2 rounded-md border border-stroke-soft-200 bg-bg-white-0 px-4 text-label-xs text-text-sub-600 hover:bg-bg-weak-50"
          >
            Carregar mais
          </button>
        </div>
      )}

      <Link
        href="/tasks/all"
        className="self-start text-label-xs text-primary-base hover:underline"
      >
        Ver todas as tarefas →
      </Link>
    </div>
  );
}
