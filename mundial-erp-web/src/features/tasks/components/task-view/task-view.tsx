'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronsLeft } from 'lucide-react';

import { cn } from '@/lib/cn';
import { useTasksStore } from '../../stores/tasks.store';
import { useTask } from '../../hooks/use-task';
import { useTaskSse } from '../../hooks/use-task-sse';
import type { TaskDetail } from '../../types/task.types';
import { DEFAULT_ACTIVITY_FILTERS } from '../../schemas/activity-filters.schema';

import { TaskTypeRow } from './task-type-row';
import { TaskTitle } from './task-title';
import { TaskPropertyGrid } from './task-property-grid';
import { TaskDescription } from './task-description';
import { CustomFieldsSection } from './custom-fields-section';
import { LinkedTasksSection } from './linked-tasks-section';
import { TimeTrackingSection } from './time-tracking-section';
import { SubtasksSection } from './subtasks-section';
import { ChecklistsSection } from './checklists-section';
import { AttachmentsSection } from './attachments-section';
import { ActivitiesPanel } from './activities-panel/activities-panel';

/**
 * Sprint 5 (TSK-150) — Container Task View.
 *
 * Responsividade (tasks.md §9):
 *   - >=1280px: Main + Activities lado-a-lado.
 *   - 1024-1280px: Activities colapsavel por padrao.
 *   - 768-1024px: Activities vira side sheet.
 *   - <768px: Coluna unica; Activities via FAB; grid vira 1 coluna.
 *
 * Estado de colapso do painel persiste em Zustand (`activitiesPanelOpen`).
 * Sprint 5 (TSK-160): integracao SSE ativa quando painel aberto e
 * propagacao de `activitiesFilters` para `useActivities`.
 */

export type TaskViewProps = {
  taskId: string;
};

type Breakpoint = 'mobile' | 'tablet' | 'laptop' | 'desktop';

function useBreakpoint(): Breakpoint {
  const [bp, setBp] = useState<Breakpoint>('desktop');
  useEffect(() => {
    function update() {
      const w = window.innerWidth;
      if (w < 768) setBp('mobile');
      else if (w < 1024) setBp('tablet');
      else if (w < 1280) setBp('laptop');
      else setBp('desktop');
    }
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);
  return bp;
}

export function TaskView({ taskId }: TaskViewProps) {
  const bp = useBreakpoint();
  const { activitiesPanelOpen, toggleActivitiesPanel, setActivitiesPanelOpen } =
    useTasksStore();
  const activityFilters = useTasksStore(
    (s) => s.activitiesFilters[taskId] ?? DEFAULT_ACTIVITY_FILTERS,
  );

  // SSE so conecta quando o painel de atividades esta aberto.
  useTaskSse(taskId, { enabled: activitiesPanelOpen });

  // Converte filtros do store para params HTTP (action CSV esperado pelo backend).
  const activityQueryParams = useMemo(() => {
    const params: {
      type?: 'ALL' | 'ACTIVITY' | 'COMMENT';
      action?: string;
      actorId?: string[];
    } = {};
    if (activityFilters.type !== 'ALL') params.type = activityFilters.type;
    if (activityFilters.actions.length > 0) {
      params.action = activityFilters.actions.join(',');
    }
    if (activityFilters.actorIds.length > 0) {
      params.actorId = activityFilters.actorIds;
    }
    return params;
  }, [activityFilters]);

  // Laptop default: colapsado. Tablet/mobile: escondido (abre como sheet).
  useEffect(() => {
    if (bp === 'laptop' && activitiesPanelOpen === true) {
      // nao forca — respeita preferencia persistida.
    }
  }, [bp, activitiesPanelOpen]);

  const { data: task, isLoading, isError, refetch } = useTask(taskId, {
    include: [
      'subtasks',
      'checklists',
      'dependencies',
      'links',
      'tags',
      'watchers',
      'attachments',
      'assignees',
    ],
  });

  if (isLoading) {
    return <TaskViewSkeleton />;
  }

  if (isError || !task) {
    return (
      <div className='flex h-full items-center justify-center bg-background p-4'>
        <div
          role='alert'
          className='flex flex-col items-center gap-3 rounded-[14px] bg-card p-8 text-center shadow-sm'
        >
          <p className='text-sm font-medium text-foreground'>
            Nao foi possivel carregar a tarefa.
          </p>
          <button
            type='button'
            onClick={() => refetch()}
            className='h-9 rounded-[10px] bg-primary px-4 text-sm font-medium text-primary-foreground transition-opacity duration-150 hover:opacity-90'
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  const showPanel =
    activitiesPanelOpen && (bp === 'desktop' || bp === 'laptop');
  const panelAsSheet = bp === 'tablet' || bp === 'mobile';

  return (
    <div
      className={cn(
        'flex h-full gap-4 bg-background p-4',
        bp === 'mobile' && 'flex-col',
      )}
    >
      <section
        className={cn(
          'flex min-w-0 flex-1 flex-col overflow-hidden rounded-[14px] bg-card shadow-sm',
        )}
      >
        <div className='flex flex-1 flex-col gap-6 overflow-y-auto px-6 py-5'>
          <TaskTypeRow task={task as TaskDetail} />
          <TaskTitle taskId={task.id} initialValue={task.title} />
          <TaskPropertyGrid task={task as TaskDetail} />
          <TaskDescription
            value={task.markdownContent ?? task.description ?? ''}
            aria-label='Descricao da tarefa'
          />

          <CustomFieldsSection taskId={task.id} />
          <LinkedTasksSection task={task as TaskDetail} />
          <TimeTrackingSection task={task as TaskDetail} />
          <SubtasksSection task={task as TaskDetail} />
          <ChecklistsSection task={task as TaskDetail} />
          <AttachmentsSection task={task as TaskDetail} />
        </div>
      </section>

      {!showPanel && !panelAsSheet && (
        <button
          type='button'
          aria-label='Abrir painel de atividades'
          onClick={() => setActivitiesPanelOpen(true)}
          className='h-10 w-6 self-center rounded-xl bg-card shadow-sm transition-opacity duration-150 hover:opacity-90'
        >
          <ChevronsLeft className='mx-auto h-4 w-4 text-muted-foreground' />
        </button>
      )}

      {showPanel && !panelAsSheet && (
        <ActivitiesPanel
          taskId={task.id}
          activityParams={activityQueryParams}
          onClose={() => toggleActivitiesPanel()}
        />
      )}

      {panelAsSheet && (
        <ActivitiesPanel
          taskId={task.id}
          activityParams={activityQueryParams}
          asSheet
          open={activitiesPanelOpen}
          onClose={() => setActivitiesPanelOpen(false)}
        />
      )}
    </div>
  );
}

function TaskViewSkeleton() {
  return (
    <div className='flex h-full gap-4 bg-background p-4' aria-busy='true'>
      <section className='flex flex-1 flex-col overflow-hidden rounded-[14px] bg-card p-6 shadow-sm'>
        <div className='h-6 w-20 animate-pulse rounded-lg bg-muted' />
        <div className='mt-4 h-9 w-2/3 animate-pulse rounded bg-muted' />
        <div className='mt-6 grid grid-cols-2 gap-x-8 gap-y-3'>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className='h-8 animate-pulse rounded bg-muted' />
          ))}
        </div>
        <div className='mt-6 h-24 animate-pulse rounded bg-muted' />
      </section>
      <aside className='hidden w-[400px] animate-pulse rounded-[14px] bg-card shadow-sm lg:block' />
    </div>
  );
}
