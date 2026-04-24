'use client';

import { useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  addDays,
  differenceInCalendarDays,
  eachDayOfInterval,
  format,
  isSameDay,
  parseISO,
  startOfDay,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/cn';
import type { Task, TaskDependency } from '../types/task.types';

type TaskGanttProps = {
  tasks: Task[];
  dependencies?: TaskDependency[];
  /** Numero de dias visiveis na escala (default 30). */
  daysVisible?: number;
  /** Data inicial (default: inicio do dia atual). */
  anchorDate?: Date;
  isLoading?: boolean;
};

const COLUMN_WIDTH_PX = 32;
const ROW_HEIGHT_PX = 36;
const SIDEBAR_WIDTH_PX = 220;

type BarPosition = {
  taskId: string;
  row: number;
  startCol: number;
  spanCols: number;
};

function getBarForTask(
  task: Task,
  days: Date[],
): Omit<BarPosition, 'row' | 'taskId'> | null {
  if (!task.startDate && !task.dueDate) return null;
  const start = task.startDate
    ? startOfDay(parseISO(task.startDate))
    : task.dueDate
      ? startOfDay(parseISO(task.dueDate))
      : null;
  const end = task.dueDate
    ? startOfDay(parseISO(task.dueDate))
    : task.startDate
      ? startOfDay(parseISO(task.startDate))
      : null;
  if (!start || !end) return null;

  const firstDay = days[0];
  const lastDay = days[days.length - 1];
  const effectiveStart = start < firstDay ? firstDay : start;
  const effectiveEnd = end > lastDay ? lastDay : end;
  if (effectiveEnd < firstDay || effectiveStart > lastDay) return null;

  const startCol = Math.max(
    0,
    differenceInCalendarDays(effectiveStart, firstDay),
  );
  const endCol = differenceInCalendarDays(effectiveEnd, firstDay);
  const spanCols = Math.max(1, endCol - startCol + 1);
  return { startCol, spanCols };
}

export function TaskGantt({
  tasks,
  dependencies,
  daysVisible = 30,
  anchorDate,
  isLoading,
}: TaskGanttProps): JSX.Element {
  const router = useRouter();
  const [scrollAnchor, setScrollAnchor] = useState<Date>(
    anchorDate ?? startOfDay(new Date()),
  );

  const gridRef = useRef<HTMLDivElement>(null);

  const days = useMemo(
    () =>
      eachDayOfInterval({
        start: scrollAnchor,
        end: addDays(scrollAnchor, daysVisible - 1),
      }),
    [scrollAnchor, daysVisible],
  );

  const bars = useMemo<BarPosition[]>(() => {
    const items: BarPosition[] = [];
    tasks.forEach((task, index) => {
      const bar = getBarForTask(task, days);
      if (!bar) return;
      items.push({
        taskId: task.id,
        row: index,
        startCol: bar.startCol,
        spanCols: bar.spanCols,
      });
    });
    return items;
  }, [tasks, days]);

  const dependencyLines = useMemo(() => {
    if (!dependencies) return [];
    const barById = new Map(bars.map((bar) => [bar.taskId, bar]));
    return dependencies
      .map((dep) => {
        const from = barById.get(dep.fromTaskId);
        const to = barById.get(dep.toTaskId);
        if (!from || !to) return null;
        return { key: dep.id, from, to };
      })
      .filter(
        (v): v is { key: string; from: BarPosition; to: BarPosition } => v !== null,
      );
  }, [dependencies, bars]);

  const gridWidth = days.length * COLUMN_WIDTH_PX;
  const gridHeight = Math.max(tasks.length, 1) * ROW_HEIGHT_PX;

  if (isLoading) {
    return (
      <div
        role="status"
        aria-busy="true"
        aria-live="polite"
        className="h-96 animate-pulse rounded-lg bg-bg-weak-50"
      />
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-stroke-soft-200 p-8 text-center text-paragraph-sm text-text-sub-600">
        Nenhuma tarefa com data definida para exibir no Gantt.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setScrollAnchor((d) => addDays(d, -daysVisible))}
          className="inline-flex h-8 items-center rounded-md border border-stroke-soft-200 bg-bg-white-0 px-3 text-label-xs text-text-sub-600 hover:bg-bg-weak-50"
        >
          Anterior
        </button>
        <button
          type="button"
          onClick={() => setScrollAnchor(startOfDay(new Date()))}
          className="inline-flex h-8 items-center rounded-md border border-stroke-soft-200 bg-bg-white-0 px-3 text-label-xs text-text-sub-600 hover:bg-bg-weak-50"
        >
          Hoje
        </button>
        <button
          type="button"
          onClick={() => setScrollAnchor((d) => addDays(d, daysVisible))}
          className="inline-flex h-8 items-center rounded-md border border-stroke-soft-200 bg-bg-white-0 px-3 text-label-xs text-text-sub-600 hover:bg-bg-weak-50"
        >
          Proximo
        </button>
        <span className="text-paragraph-xs text-text-sub-600">
          {format(days[0], "dd 'de' MMM", { locale: ptBR })} —{' '}
          {format(days[days.length - 1], "dd 'de' MMM", { locale: ptBR })}
        </span>
      </div>

      <div
        className="overflow-auto rounded-lg border border-stroke-soft-200"
        role="region"
        aria-label="Gantt de tarefas"
      >
        <div
          className="grid"
          style={{
            gridTemplateColumns: `${SIDEBAR_WIDTH_PX}px ${gridWidth}px`,
          }}
        >
          {/* Sidebar header */}
          <div className="sticky left-0 top-0 z-20 border-b border-r border-stroke-soft-200 bg-bg-white-0 px-3 py-2 text-label-xs uppercase text-text-sub-600">
            Tarefa
          </div>
          <div className="sticky top-0 z-10 flex border-b border-stroke-soft-200 bg-bg-white-0">
            {days.map((day) => (
              <div
                key={day.toISOString()}
                className={cn(
                  'flex flex-col items-center justify-center text-subheading-2xs text-text-sub-600',
                  isSameDay(day, new Date()) &&
                    'bg-primary-alpha-10 text-primary-base',
                )}
                style={{ width: COLUMN_WIDTH_PX, height: 40 }}
              >
                <span>{format(day, 'EEE', { locale: ptBR }).slice(0, 1)}</span>
                <span>{format(day, 'dd')}</span>
              </div>
            ))}
          </div>

          {/* Sidebar rows */}
          <div className="sticky left-0 z-10 flex flex-col border-r border-stroke-soft-200 bg-bg-white-0">
            {tasks.map((task) => (
              <button
                key={task.id}
                type="button"
                onClick={() => router.push(`/tasks/${task.id}`)}
                className="flex items-center border-b border-stroke-soft-200 px-3 text-left text-paragraph-xs text-text-strong-950 hover:bg-bg-weak-50"
                style={{ height: ROW_HEIGHT_PX }}
              >
                <span className="line-clamp-1">{task.title}</span>
              </button>
            ))}
          </div>

          {/* Grid background + bars */}
          <div
            ref={gridRef}
            className="relative"
            style={{ width: gridWidth, height: gridHeight }}
          >
            {/* column separators */}
            {days.map((day, colIdx) => (
              <div
                key={day.toISOString()}
                className={cn(
                  'absolute top-0 border-l border-stroke-soft-200',
                  isSameDay(day, new Date()) && 'border-primary-base',
                )}
                style={{
                  left: colIdx * COLUMN_WIDTH_PX,
                  width: COLUMN_WIDTH_PX,
                  height: gridHeight,
                }}
              />
            ))}
            {/* row separators */}
            {tasks.map((_, rowIdx) => (
              <div
                key={rowIdx}
                className="absolute left-0 w-full border-b border-stroke-soft-200"
                style={{
                  top: (rowIdx + 1) * ROW_HEIGHT_PX - 1,
                  height: 1,
                }}
              />
            ))}
            {/* bars */}
            {bars.map((bar) => {
              const task = tasks.find((t) => t.id === bar.taskId);
              if (!task) return null;
              return (
                <button
                  key={bar.taskId}
                  type="button"
                  onClick={() => router.push(`/tasks/${task.id}`)}
                  className="absolute flex items-center rounded-md text-subheading-2xs text-static-white shadow-regular-xs transition-transform hover:scale-[1.02]"
                  style={{
                    left: bar.startCol * COLUMN_WIDTH_PX + 2,
                    top: bar.row * ROW_HEIGHT_PX + 6,
                    width: bar.spanCols * COLUMN_WIDTH_PX - 4,
                    height: ROW_HEIGHT_PX - 12,
                    backgroundColor: task.status.color,
                  }}
                  aria-label={`${task.title} - ${task.status.name}`}
                >
                  <span className="truncate px-2">{task.title}</span>
                </button>
              );
            })}

            {/* Dependency SVG overlay (read-only) */}
            <svg
              aria-hidden
              className="pointer-events-none absolute left-0 top-0"
              width={gridWidth}
              height={gridHeight}
            >
              {dependencyLines.map((dep) => {
                const fromX =
                  (dep.from.startCol + dep.from.spanCols) * COLUMN_WIDTH_PX;
                const fromY = dep.from.row * ROW_HEIGHT_PX + ROW_HEIGHT_PX / 2;
                const toX = dep.to.startCol * COLUMN_WIDTH_PX;
                const toY = dep.to.row * ROW_HEIGHT_PX + ROW_HEIGHT_PX / 2;
                const midX = (fromX + toX) / 2;
                return (
                  <path
                    key={dep.key}
                    d={`M ${fromX} ${fromY} L ${midX} ${fromY} L ${midX} ${toY} L ${toX} ${toY}`}
                    stroke="currentColor"
                    strokeWidth={1.5}
                    fill="none"
                    className="text-text-sub-600"
                  />
                );
              })}
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
