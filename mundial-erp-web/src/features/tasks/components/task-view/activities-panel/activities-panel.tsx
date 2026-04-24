'use client';

import { cn } from '@/lib/cn';

import type { TaskActivitiesListParams } from '../../../services/task-activities.service';
import { ActivitiesHeader } from './activities-header';
import { ActivityFeed } from './activity-feed';
import { CommentComposer } from './comment-composer';

/**
 * Sprint 5 (TSK-150) — ActivitiesPanel container.
 * tasks.md §5 — w-[400px] rounded-[14px] shadow-sm bg-card.
 *
 * Modo `asSheet` (responsivo <=1024px): ancorado a direita como side sheet.
 *
 * Sprint 5 (TSK-160): `activityParams` propaga filtros aplicados via
 * Zustand para o hook `useActivities` no feed.
 */

export type ActivitiesPanelProps = {
  taskId: string;
  onClose?: () => void;
  asSheet?: boolean;
  open?: boolean;
  activityParams?: Omit<TaskActivitiesListParams, 'cursor' | 'page'>;
};

export function ActivitiesPanel({
  taskId,
  onClose,
  asSheet = false,
  open = true,
  activityParams,
}: ActivitiesPanelProps) {
  if (asSheet && !open) return null;

  return (
    <aside
      className={cn(
        'flex flex-col overflow-hidden rounded-[14px] bg-card shadow-sm',
        asSheet
          ? 'fixed inset-y-0 right-0 z-30 w-[90vw] max-w-[400px]'
          : 'w-[400px]',
      )}
      aria-label='Painel de atividades'
    >
      <ActivitiesHeader taskId={taskId} onClose={onClose} />
      <ActivityFeed taskId={taskId} params={activityParams} />
      <CommentComposer taskId={taskId} />
    </aside>
  );
}
