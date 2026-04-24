'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  addDays,
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
  subWeeks,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatInTimeZone, toZonedTime } from 'date-fns-tz';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  RiArrowLeftSLine,
  RiArrowRightSLine,
} from '@remixicon/react';
import { cn } from '@/lib/cn';
import * as Modal from '@/components/ui/modal';
import { useUpdateTask } from '../hooks/use-update-task';
import type { Task } from '../types/task.types';

type TaskCalendarProps = {
  tasks: Task[];
  /** IANA tz — default America/Sao_Paulo. */
  timezone?: string;
  isLoading?: boolean;
};

type ViewMode = 'month' | 'week';

type PendingDrop = {
  task: Task;
  targetDate: Date;
};

function getDueDateInTz(dueDate: string | null, tz: string): Date | null {
  if (!dueDate) return null;
  const parsed = parseISO(dueDate);
  if (Number.isNaN(parsed.getTime())) return null;
  return toZonedTime(parsed, tz);
}

function buildIsoForDate(current: string | null, target: Date): string {
  // Preserva hora/minuto/segundo do valor atual quando disponivel.
  const base = current ? parseISO(current) : new Date();
  const result = new Date(target);
  result.setHours(
    base.getHours(),
    base.getMinutes(),
    base.getSeconds(),
    base.getMilliseconds(),
  );
  return result.toISOString();
}

export function TaskCalendar({
  tasks,
  timezone = 'America/Sao_Paulo',
  isLoading,
}: TaskCalendarProps): JSX.Element {
  const router = useRouter();
  const updateTask = useUpdateTask();
  const [mode, setMode] = useState<ViewMode>('month');
  const [anchor, setAnchor] = useState<Date>(new Date());
  const [pendingDrop, setPendingDrop] = useState<PendingDrop | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  );

  const { start, end, gridDays } = useMemo(() => {
    if (mode === 'month') {
      const monthStart = startOfMonth(anchor);
      const monthEnd = endOfMonth(anchor);
      const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
      const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
      return {
        start: monthStart,
        end: monthEnd,
        gridDays: eachDayOfInterval({ start: gridStart, end: gridEnd }),
      };
    }
    const weekStart = startOfWeek(anchor, { weekStartsOn: 0 });
    const weekEnd = endOfWeek(anchor, { weekStartsOn: 0 });
    return {
      start: weekStart,
      end: weekEnd,
      gridDays: eachDayOfInterval({ start: weekStart, end: weekEnd }),
    };
  }, [anchor, mode]);

  const tasksByDay = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const task of tasks) {
      const zonedDate = getDueDateInTz(task.dueDate, timezone);
      if (!zonedDate) continue;
      const key = format(zonedDate, 'yyyy-MM-dd');
      const bucket = map.get(key) ?? [];
      bucket.push(task);
      map.set(key, bucket);
    }
    return map;
  }, [tasks, timezone]);

  const handleDragEnd = (event: DragEndEvent) => {
    const over = event.over;
    const active = event.active;
    if (!over || !active) return;
    const activeData = active.data.current as
      | { task: Task }
      | undefined;
    const overData = over.data.current as { date: Date } | undefined;
    if (!activeData || !overData) return;
    const zoned = getDueDateInTz(activeData.task.dueDate, timezone);
    if (zoned && isSameDay(zoned, overData.date)) return;
    setPendingDrop({ task: activeData.task, targetDate: overData.date });
  };

  const confirmDrop = () => {
    if (!pendingDrop) return;
    const { task, targetDate } = pendingDrop;
    const nextDueDate = buildIsoForDate(task.dueDate, targetDate);
    updateTask.mutate(
      {
        taskId: task.id,
        payload: { dueDate: nextDueDate },
      },
      {
        onSettled: () => setPendingDrop(null),
      },
    );
  };

  const goPrev = () =>
    setAnchor((current) =>
      mode === 'month' ? subMonths(current, 1) : subWeeks(current, 1),
    );
  const goNext = () =>
    setAnchor((current) =>
      mode === 'month' ? addMonths(current, 1) : addWeeks(current, 1),
    );
  const goToday = () => setAnchor(new Date());

  const label =
    mode === 'month'
      ? formatInTimeZone(anchor, timezone, "MMMM 'de' yyyy", {
          locale: ptBR,
        })
      : `${formatInTimeZone(start, timezone, 'dd MMM', { locale: ptBR })} - ${formatInTimeZone(end, timezone, 'dd MMM', { locale: ptBR })}`;

  return (
    <div className="flex flex-col gap-3">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={goPrev}
            aria-label="Periodo anterior"
            className="inline-flex size-8 items-center justify-center rounded-md border border-stroke-soft-200 bg-bg-white-0 hover:bg-bg-weak-50"
          >
            <RiArrowLeftSLine className="size-4" aria-hidden />
          </button>
          <button
            type="button"
            onClick={goNext}
            aria-label="Proximo periodo"
            className="inline-flex size-8 items-center justify-center rounded-md border border-stroke-soft-200 bg-bg-white-0 hover:bg-bg-weak-50"
          >
            <RiArrowRightSLine className="size-4" aria-hidden />
          </button>
          <button
            type="button"
            onClick={goToday}
            className="inline-flex h-8 items-center rounded-md border border-stroke-soft-200 bg-bg-white-0 px-3 text-label-xs text-text-sub-600 hover:bg-bg-weak-50"
          >
            Hoje
          </button>
          <h2 className="pl-2 text-label-md capitalize text-text-strong-950">
            {label}
          </h2>
        </div>
        <div
          role="tablist"
          aria-label="Modo de visualizacao"
          className="inline-flex rounded-md border border-stroke-soft-200 bg-bg-white-0 p-0.5"
        >
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'month'}
            onClick={() => setMode('month')}
            className={cn(
              'rounded-md px-2 py-1 text-label-xs',
              mode === 'month'
                ? 'bg-bg-weak-50 text-text-strong-950'
                : 'text-text-sub-600 hover:bg-bg-weak-50',
            )}
          >
            Mes
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'week'}
            onClick={() => setMode('week')}
            className={cn(
              'rounded-md px-2 py-1 text-label-xs',
              mode === 'week'
                ? 'bg-bg-weak-50 text-text-strong-950'
                : 'text-text-sub-600 hover:bg-bg-weak-50',
            )}
          >
            Semana
          </button>
        </div>
      </header>

      {isLoading ? (
        <div
          role="status"
          aria-live="polite"
          aria-busy="true"
          className="h-96 animate-pulse rounded-lg bg-bg-weak-50"
        />
      ) : (
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          <div
            role="grid"
            aria-label={`Calendario - ${label}`}
            className="grid grid-cols-1 gap-2 md:grid-cols-7"
          >
            {gridDays.map((day) => {
              const key = format(day, 'yyyy-MM-dd');
              const dayTasks = tasksByDay.get(key) ?? [];
              return (
                <CalendarCell
                  key={key}
                  date={day}
                  tasks={dayTasks}
                  timezone={timezone}
                  onOpenTask={(taskId) => router.push(`/tasks/${taskId}`)}
                />
              );
            })}
          </div>
        </DndContext>
      )}

      <Modal.Root
        open={Boolean(pendingDrop)}
        onOpenChange={(open) => !open && setPendingDrop(null)}
      >
        <Modal.Content>
          <Modal.Header
            title="Alterar data da tarefa?"
            description={
              pendingDrop
                ? `"${pendingDrop.task.title}" sera movida para ${formatInTimeZone(
                    pendingDrop.targetDate,
                    timezone,
                    "dd 'de' MMMM",
                    { locale: ptBR },
                  )}.`
                : ''
            }
          />
          <Modal.Footer>
            <button
              type="button"
              onClick={() => setPendingDrop(null)}
              className="inline-flex h-9 items-center rounded-md border border-stroke-soft-200 bg-bg-white-0 px-4 text-label-xs text-text-sub-600 hover:bg-bg-weak-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={confirmDrop}
              className="inline-flex h-9 items-center rounded-md bg-primary-base px-4 text-label-xs text-static-white hover:bg-primary-darker"
            >
              Confirmar
            </button>
          </Modal.Footer>
        </Modal.Content>
      </Modal.Root>
    </div>
  );
}

function CalendarCell({
  date,
  tasks,
  timezone,
  onOpenTask,
}: {
  date: Date;
  tasks: Task[];
  timezone: string;
  onOpenTask: (taskId: string) => void;
}): JSX.Element {
  const { setNodeRef, isOver } = useDroppable({
    id: `day:${format(date, 'yyyy-MM-dd')}`,
    data: { date },
  });

  const today = isSameDay(date, new Date());

  return (
    <div
      ref={setNodeRef}
      role="gridcell"
      aria-label={formatInTimeZone(date, timezone, "EEEE, dd 'de' MMMM", {
        locale: ptBR,
      })}
      className={cn(
        'flex min-h-[120px] flex-col rounded-md border border-stroke-soft-200 bg-bg-white-0 p-2 transition-colors',
        today && 'border-primary-base',
        isOver && 'bg-primary-alpha-10',
      )}
    >
      <div className="mb-2 flex items-center justify-between text-subheading-2xs text-text-sub-600">
        <span className={cn(today && 'font-semibold text-primary-base')}>
          {format(date, 'd')}
        </span>
      </div>
      <ul className="flex flex-col gap-1" role="list">
        {tasks.map((task) => (
          <DraggableCalendarItem
            key={task.id}
            task={task}
            onOpen={onOpenTask}
          />
        ))}
      </ul>
    </div>
  );
}

function DraggableCalendarItem({
  task,
  onOpen,
}: {
  task: Task;
  onOpen: (taskId: string) => void;
}): JSX.Element {
  const { setNodeRef, attributes, listeners, isDragging } = useDraggable({
    id: `calendar-task:${task.id}`,
    data: { task },
  });

  return (
    <li
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      role="listitem"
      onClick={(event) => {
        if ((event.target as HTMLElement).closest('[data-drag-ignore]')) return;
        onOpen(task.id);
      }}
      className={cn(
        'cursor-grab rounded-md px-2 py-1 text-subheading-2xs text-text-strong-950 shadow-regular-xs transition-colors hover:bg-bg-weak-50',
        isDragging && 'opacity-50',
      )}
      style={{
        backgroundColor: `${task.status.color}1A`,
        borderLeft: `3px solid ${task.status.color}`,
      }}
    >
      <span className="line-clamp-1">{task.title}</span>
    </li>
  );
}
