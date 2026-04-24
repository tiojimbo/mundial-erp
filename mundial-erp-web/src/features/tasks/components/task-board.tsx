'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  RiAddLine,
  RiCalendarLine,
  RiMoreLine,
  RiUser3Line,
} from '@remixicon/react';
import {
  closestCorners,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragCancelEvent,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { restrictToWindowEdges } from '@dnd-kit/modifiers';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/cn';
import { StatusIcon } from '@/features/work-items/components/status-icon';
import { useUpdateTaskStatus } from '../hooks/use-update-task-status';
import type { Task, TaskStatus } from '../types/task.types';

type TaskBoardProps = {
  tasks: Task[];
  statuses: TaskStatus[];
  wipLimits?: Record<string, number | undefined>;
  isLoading?: boolean;
  onAddTask?: (statusId: string) => void;
};

type ColumnData = { status: TaskStatus; tasks: Task[] };

function groupByStatus(tasks: Task[], statuses: TaskStatus[]): ColumnData[] {
  const byId = new Map<string, Task[]>();
  for (const status of statuses) byId.set(status.id, []);
  for (const task of tasks) {
    const bucket = byId.get(task.statusId);
    if (bucket) bucket.push(task);
  }
  return statuses.map((status) => ({
    status,
    tasks: byId.get(status.id) ?? [],
  }));
}

/**
 * Converte hex (#RRGGBB) em `r g b` separado por espaco, formato CSS
 * moderno — permite aplicar alpha via `rgb(r g b / 0.25)`.
 * Fallback neutro quando o input nao e hex valido.
 */
function hexToRgbTriplet(hex: string): string {
  const match = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) return '148 163 184';
  let raw = match[1];
  if (raw.length === 3) {
    raw = raw
      .split('')
      .map((c) => c + c)
      .join('');
  }
  const r = parseInt(raw.slice(0, 2), 16);
  const g = parseInt(raw.slice(2, 4), 16);
  const b = parseInt(raw.slice(4, 6), 16);
  return `${r} ${g} ${b}`;
}

function formatDateRange(
  startIso: string | null,
  endIso: string | null,
): string | null {
  const parse = (iso: string | null) => {
    if (!iso) return null;
    const d = parseISO(iso);
    return Number.isNaN(d.getTime()) ? null : d;
  };
  const start = parse(startIso);
  const end = parse(endIso);
  if (!start && !end) return null;
  const fmt = (d: Date) => format(d, 'dd MMM', { locale: ptBR });
  if (start && end) return `${fmt(start)} → ${fmt(end)}`;
  return fmt((start ?? end) as Date);
}

function initialsFromName(name: string | null | undefined): string {
  if (!name) return '??';
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p.charAt(0).toUpperCase()).join('') || '?';
}

const AVATAR_COLORS = [
  '#7c3aed',
  '#ec4899',
  '#2563eb',
  '#16a34a',
  '#f97316',
  '#0891b2',
  '#dc2626',
  '#9333ea',
];

function avatarColorForId(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

type BoardTaskCardProps = {
  task: Task;
  overlay?: boolean;
  draggableHandleProps?: React.HTMLAttributes<HTMLDivElement>;
};

function BoardTaskCard({
  task,
  overlay,
  draggableHandleProps,
}: BoardTaskCardProps): JSX.Element {
  const dateLabel = formatDateRange(task.startDate, task.dueDate);
  const visibleAssignees = task.assignees.slice(0, 3);
  const extraAssignees = Math.max(0, task.assignees.length - visibleAssignees.length);

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Tarefa ${task.title}`}
      className={cn(
        'group relative flex h-[103.6px] w-[268px] flex-col rounded-lg border border-stroke-soft-200 bg-bg-white-0 p-3 text-left shadow-regular-xs',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-base/50',
        overlay && 'shadow-regular-md',
      )}
      {...(draggableHandleProps ?? {})}
    >
      <Link
        href={`/tasks/${task.id}`}
        className="block truncate text-[13px] font-semibold text-text-strong-950 outline-none hover:underline"
        onClick={(event) => event.stopPropagation()}
      >
        {task.title}
      </Link>

      <div className="mt-2 flex flex-col gap-1.5">
        <div
          className="flex -space-x-1"
          aria-label={
            visibleAssignees.length > 0
              ? `${task.assignees.length} responsável(is)`
              : 'Sem responsável'
          }
        >
          {visibleAssignees.length > 0 ? (
            <>
              {visibleAssignees.map((assignee) => (
                <span
                  key={assignee.userId}
                  data-slot="avatar"
                  title={assignee.userName ?? undefined}
                  className="relative flex size-6 shrink-0 overflow-hidden rounded-full ring-2 ring-white"
                >
                  <span
                    data-slot="avatar-fallback"
                    className="flex size-full items-center justify-center rounded-full text-[10px] font-semibold"
                    style={{
                      backgroundColor: avatarColorForId(assignee.userId),
                      color: 'rgb(255, 255, 255)',
                    }}
                  >
                    {initialsFromName(assignee.userName)}
                  </span>
                </span>
              ))}
              {extraAssignees > 0 && (
                <span
                  data-slot="avatar"
                  className="relative flex size-6 shrink-0 overflow-hidden rounded-full ring-2 ring-white"
                >
                  <span
                    data-slot="avatar-fallback"
                    className="flex size-full items-center justify-center rounded-full bg-bg-weak-50 text-[10px] font-semibold text-text-sub-600"
                  >
                    +{extraAssignees}
                  </span>
                </span>
              )}
            </>
          ) : (
            <span
              data-slot="avatar"
              title="Sem responsável"
              className="relative flex size-6 shrink-0 overflow-hidden rounded-full ring-2 ring-white"
            >
              <span
                data-slot="avatar-fallback"
                className="flex size-full items-center justify-center rounded-full bg-bg-weak-50 text-text-sub-600"
              >
                <RiUser3Line aria-hidden className="size-3" />
              </span>
            </span>
          )}
        </div>

        <span
          className="inline-flex w-fit items-center gap-1 rounded-md bg-bg-weak-50 px-1.5 py-0.5 text-subheading-2xs text-text-sub-600"
        >
          <RiCalendarLine aria-hidden className="size-3" />
          <span className="truncate">{dateLabel ?? 'Sem prazo'}</span>
        </span>
      </div>
    </div>
  );
}

function SortableBoardCard({ task }: { task: Task }): JSX.Element {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    data: { taskId: task.id, statusId: task.statusId },
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <BoardTaskCard task={task} />
    </div>
  );
}

type BoardColumnProps = {
  column: ColumnData;
  wipLimit: number | undefined;
  onAddTask?: (statusId: string) => void;
};

function BoardColumn({
  column,
  wipLimit,
  onAddTask,
}: BoardColumnProps): JSX.Element {
  const { setNodeRef, isOver } = useDroppable({
    id: column.status.id,
    data: { statusId: column.status.id },
  });

  const rgbTriplet = hexToRgbTriplet(column.status.color);
  const overLimit =
    typeof wipLimit === 'number' && column.tasks.length > wipLimit;

  return (
    <section
      aria-label={`Coluna ${column.status.name}`}
      className={cn(
        'flex max-h-full min-h-0 w-[280px] shrink-0 flex-col rounded-xl p-1.5 transition-colors',
        isOver && 'ring-2 ring-offset-0',
      )}
      style={{
        backgroundColor: `rgb(${rgbTriplet} / 0.05)`,
        ...(isOver ? { boxShadow: `inset 0 0 0 2px rgb(${rgbTriplet} / 0.30)` } : {}),
      }}
    >
      <header className="mb-3 flex items-center justify-between gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-1.5">
          <span
            className="inline-flex items-center gap-1 rounded-md px-2 py-0.5"
            style={{ backgroundColor: `rgb(${rgbTriplet} / 0.15)` }}
          >
            <StatusIcon
              category={column.status.category}
              color={column.status.color}
              size={12}
            />
            <span
              className="text-[11px] font-bold uppercase tracking-wide"
              style={{ color: `rgb(${rgbTriplet})` }}
            >
              {column.status.name}
            </span>
          </span>
          <span
            className="text-[12px] font-semibold tabular-nums"
            style={{
              color: overLimit
                ? undefined
                : `rgb(${rgbTriplet} / 0.85)`,
            }}
            aria-label={`${column.tasks.length} tarefa(s)`}
          >
            <span className={cn(overLimit && 'text-error-base')}>
              {column.tasks.length}
              {typeof wipLimit === 'number' ? `/${wipLimit}` : null}
            </span>
          </span>
        </div>
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            aria-label={`Opções da coluna ${column.status.name}`}
            className="rounded p-1 text-text-sub-600 transition-colors hover:bg-bg-white-0/60 hover:text-text-strong-950"
          >
            <RiMoreLine className="size-3.5" />
          </button>
          <button
            type="button"
            aria-label={`Adicionar tarefa em ${column.status.name}`}
            onClick={() => onAddTask?.(column.status.id)}
            className="rounded p-1 text-text-sub-600 transition-colors hover:bg-bg-white-0/60 hover:text-text-strong-950"
          >
            <RiAddLine className="size-3.5" />
          </button>
        </div>
      </header>

      <div
        ref={setNodeRef}
        data-droppable-id={column.status.id}
        className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto"
      >
        <SortableContext
          items={column.tasks.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          {column.tasks.map((task) => (
            <SortableBoardCard key={task.id} task={task} />
          ))}
        </SortableContext>

        <button
          type="button"
          onClick={() => onAddTask?.(column.status.id)}
          className="flex items-center gap-1 rounded-md px-1 py-1.5 text-left text-subheading-2xs font-medium transition-colors hover:bg-bg-white-0/50"
          style={{ color: `rgb(${rgbTriplet} / 0.9)` }}
        >
          <RiAddLine aria-hidden className="size-3.5" />
          Adicionar tarefa
        </button>
      </div>
    </section>
  );
}

export function TaskBoard({
  tasks,
  statuses,
  wipLimits,
  isLoading,
  onAddTask,
}: TaskBoardProps): JSX.Element {
  const updateStatus = useUpdateTaskStatus();
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  // Preview otimista: espelha `tasks` quando ocioso; durante drag, é mutado
  // em `onDragOver` para refletir o destino antes do soltar — gera a sensação
  // de contagem/posição atualizando em tempo real.
  const [previewTasks, setPreviewTasks] = useState<Task[]>(tasks);
  const isDraggingRef = useRef(false);
  useEffect(() => {
    if (!isDraggingRef.current) setPreviewTasks(tasks);
  }, [tasks]);

  const columns = useMemo(
    () => groupByStatus(previewTasks, statuses),
    [previewTasks, statuses],
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragStart = (event: DragStartEvent) => {
    const data = event.active.data.current as
      | { taskId: string; statusId: string }
      | undefined;
    if (!data) return;
    const task = tasks.find((t) => t.id === data.taskId) ?? null;
    isDraggingRef.current = true;
    setActiveTask(task);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over || !active) return;

    const activeData = active.data.current as
      | { taskId: string; statusId: string }
      | undefined;
    if (!activeData) return;

    const overStatusId =
      (over.data.current as { statusId?: string } | undefined)?.statusId ??
      (typeof over.id === 'string' ? over.id : undefined);
    if (!overStatusId) return;

    const overTaskId = (over.data.current as { taskId?: string } | undefined)
      ?.taskId;

    setPreviewTasks((current) => {
      const activeIndex = current.findIndex((t) => t.id === activeData.taskId);
      if (activeIndex < 0) return current;
      const activeItem = current[activeIndex];

      // Hovering sobre outro card — reordena / move com precisão de índice.
      if (overTaskId !== undefined) {
        const overIndex = current.findIndex((t) => t.id === overTaskId);
        if (overIndex < 0) return current;

        // Mesma coluna: reordena in-place.
        if (activeItem.statusId === overStatusId) {
          if (activeIndex === overIndex) return current;
          return arrayMove(current, activeIndex, overIndex);
        }

        // Troca de coluna: muda statusId e posiciona perto do `over`.
        const next = current.slice();
        next.splice(activeIndex, 1);
        const insertIndex = overIndex > activeIndex ? overIndex - 1 : overIndex;
        next.splice(insertIndex, 0, {
          ...activeItem,
          statusId: overStatusId,
          status: activeItem.status,
        });
        return next;
      }

      // Hovering sobre a própria coluna (zona vazia) — garante que o statusId
      // reflita o destino, agora, sem esperar o soltar.
      if (activeItem.statusId === overStatusId) return current;
      const next = current.slice();
      next[activeIndex] = { ...activeItem, statusId: overStatusId };
      return next;
    });
  };

  const handleDragCancel = (_event: DragCancelEvent) => {
    isDraggingRef.current = false;
    setActiveTask(null);
    setPreviewTasks(tasks);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    isDraggingRef.current = false;
    setActiveTask(null);
    const { active, over } = event;
    if (!over || !active) {
      setPreviewTasks(tasks);
      return;
    }

    const activeData = active.data.current as
      | { taskId: string; statusId: string }
      | undefined;
    if (!activeData) {
      setPreviewTasks(tasks);
      return;
    }

    const taskId = activeData.taskId;
    const originalStatusId = activeData.statusId;
    // O preview já está no destino graças ao `onDragOver`; pegamos o statusId
    // final direto de lá para persistir.
    const finalTask = previewTasks.find((t) => t.id === taskId);
    const finalStatusId = finalTask?.statusId ?? originalStatusId;

    if (finalStatusId === originalStatusId) return;

    const finalStatus =
      statuses.find((s) => s.id === finalStatusId) ?? finalTask?.status;
    if (!finalStatus) {
      setPreviewTasks(tasks);
      return;
    }

    // Mesmo hook usado pelo popover de status da list view — já aplica
    // update otimista no cache detail, lists e principalmente no cache
    // `work-items/grouped` (via `moveTaskBetweenGroups`), que é a fonte do
    // board. É isso que faz o status refletir em todas as views e ao abrir
    // a task.
    updateStatus.mutate(
      { taskId, statusId: finalStatusId, status: finalStatus },
      {
        onError: () => {
          setPreviewTasks(tasks);
        },
      },
    );
  };

  if (isLoading) {
    return (
      <div
        className="flex gap-2 overflow-x-auto p-2"
        role="status"
        aria-live="polite"
        aria-busy="true"
      >
        {statuses.map((s) => (
          <div
            key={s.id}
            className="h-48 w-[280px] shrink-0 animate-pulse rounded-lg bg-bg-weak-50"
          />
        ))}
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
      modifiers={[restrictToWindowEdges]}
      autoScroll={{ threshold: { x: 0.2, y: 0.2 } }}
    >
      <div
        className="flex min-h-0 flex-1 overflow-x-auto"
        aria-label="Quadro Kanban"
      >
        <div className="flex h-full items-start gap-2 p-2">
          {columns.map((column) => (
            <BoardColumn
              key={column.status.id}
              column={column}
              wipLimit={wipLimits?.[column.status.id]}
              onAddTask={onAddTask}
            />
          ))}
        </div>
      </div>

      <DragOverlay>
        {activeTask ? <BoardTaskCard task={activeTask} overlay /> : null}
      </DragOverlay>
    </DndContext>
  );
}
