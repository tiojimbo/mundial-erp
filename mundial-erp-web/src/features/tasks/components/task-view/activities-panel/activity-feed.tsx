'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import { useActivities } from '../../../hooks/use-activities';
import { useComments } from '../../../hooks/use-comments';
import type {
  ActivitiesListResponse,
  TaskActivitiesListParams,
} from '../../../services/task-activities.service';
import type { TaskActivity, TaskComment } from '../../../types/task.types';

import { ActivityItem } from './activity-item';

/**
 * Sprint 5 (TSK-150) — Feed de atividades.
 * tasks.md §5.2 — <ul role="log" aria-live="polite"> scroll interno.
 * Virtualizacao em >= 500 itens (TODO Sprint 5.1: react-virtuoso).
 *
 * Sprint 5 (TSK-160): consome `useActivities(taskId, params)`. Quando `activities`
 * e passado como prop (Storybook, testes), cai no modo controlado.
 */

export type ActivityFeedProps = {
  taskId: string;
  /** Modo controlado (tests/Storybook). Se ausente, usa `useActivities`. */
  activities?: TaskActivity[];
  /** Filtros propagados do `TaskView`. */
  params?: Omit<TaskActivitiesListParams, 'cursor' | 'page'>;
};

export function ActivityFeed({
  taskId,
  activities: controlled,
  params,
}: ActivityFeedProps) {
  const query = useActivities(taskId, params, controlled === undefined);
  const commentsQuery = useComments(
    taskId,
    undefined,
    controlled === undefined,
  );
  const activities = useMemo(() => {
    if (controlled !== undefined) return controlled;
    return (query.data as ActivitiesListResponse | undefined)?.items ?? [];
  }, [controlled, query.data]);

  const commentsById = useMemo(() => {
    const raw = commentsQuery.data as
      | { items?: TaskComment[]; data?: TaskComment[] }
      | TaskComment[]
      | undefined;
    const list: TaskComment[] = Array.isArray(raw)
      ? raw
      : (raw?.data ?? raw?.items ?? []);
    const map = new Map<string, TaskComment>();
    for (const c of list) map.set(c.id, c);
    return map;
  }, [commentsQuery.data]);

  const [newIds, setNewIds] = useState<Set<string>>(new Set());
  const prevIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const current = new Set(activities.map((a) => a.id));
    const added = new Set<string>();
    for (const id of current) {
      if (!prevIdsRef.current.has(id)) added.add(id);
    }
    if (added.size > 0) {
      setNewIds(added);
      const t = setTimeout(() => setNewIds(new Set()), 300);
      return () => clearTimeout(t);
    }
    prevIdsRef.current = current;
    return undefined;
  }, [activities]);

  if (controlled === undefined && query.isLoading) {
    return (
      <div
        className='flex-1 px-4 py-6 text-center text-[12px] text-muted-foreground'
        aria-busy='true'
      >
        Carregando atividades...
      </div>
    );
  }

  if (controlled === undefined && query.isError) {
    return (
      <div
        role='alert'
        className='flex-1 px-4 py-6 text-center text-[12px] text-destructive'
      >
        Falha ao carregar atividades.
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className='flex-1 px-4 py-6 text-center text-[12px] text-muted-foreground'>
        Nenhuma atividade ainda.
      </div>
    );
  }

  return (
    <ul
      role='log'
      aria-live='polite'
      aria-label='Linha do tempo de atividades'
      className='flex-1 space-y-2 overflow-y-auto px-4 py-3'
    >
      {activities.map((a) => (
        <ActivityItem
          key={a.id}
          activity={a}
          isNew={newIds.has(a.id)}
          taskId={taskId}
          commentsById={commentsById}
        />
      ))}
    </ul>
  );
}
