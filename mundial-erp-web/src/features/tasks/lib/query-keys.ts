import type { TaskFilters } from '../types/task.types';
import type { TaskActivitiesListParams } from '../services/task-activities.service';
import type { TaskCommentsListParams } from '../services/task-comments.service';

/**
 * Query keys centralizadas — padrao `[workspaceId, 'tasks', taskId, resource, ...params]`.
 *
 * Estrategia:
 * - `workspaceId` no prefixo garante isolamento entre workspaces apos switch
 *   (cache nao vaza entre tenants).
 * - Segmentos opcionais omitidos quando ausentes.
 * - Sempre `as const` para inferencia de tupla estrita no React Query v5.
 */
export const taskQueryKeys = {
  all: (workspaceId: string) => [workspaceId, 'tasks'] as const,

  // Listas
  lists: (workspaceId: string) =>
    [...taskQueryKeys.all(workspaceId), 'list'] as const,
  list: (workspaceId: string, filters?: TaskFilters) =>
    [...taskQueryKeys.lists(workspaceId), filters ?? {}] as const,

  // Detalhes
  details: (workspaceId: string) =>
    [...taskQueryKeys.all(workspaceId), 'detail'] as const,
  detail: (workspaceId: string, taskId: string, include?: string[]) =>
    [...taskQueryKeys.details(workspaceId), taskId, include ?? []] as const,

  // Sub-recursos
  tags: (workspaceId: string) =>
    [...taskQueryKeys.all(workspaceId), 'tags'] as const,
  watchers: (workspaceId: string, taskId: string) =>
    [...taskQueryKeys.all(workspaceId), taskId, 'watchers'] as const,
  dependencies: (workspaceId: string, taskId: string) =>
    [...taskQueryKeys.all(workspaceId), taskId, 'dependencies'] as const,
  links: (workspaceId: string, taskId: string) =>
    [...taskQueryKeys.all(workspaceId), taskId, 'links'] as const,
  checklists: (workspaceId: string, taskId: string) =>
    [...taskQueryKeys.all(workspaceId), taskId, 'checklists'] as const,
  attachments: (workspaceId: string, taskId: string) =>
    [...taskQueryKeys.all(workspaceId), taskId, 'attachments'] as const,
  comments: (
    workspaceId: string,
    taskId: string,
    params?: TaskCommentsListParams,
  ) =>
    [
      ...taskQueryKeys.all(workspaceId),
      taskId,
      'comments',
      params ?? {},
    ] as const,
  activities: (
    workspaceId: string,
    taskId: string,
    params?: TaskActivitiesListParams,
  ) =>
    [
      ...taskQueryKeys.all(workspaceId),
      taskId,
      'activities',
      params ?? {},
    ] as const,
  templates: (workspaceId: string) =>
    [workspaceId, 'task-templates'] as const,
  customTaskTypes: (workspaceId: string) =>
    [workspaceId, 'custom-task-types'] as const,
};

export const TASKS_STALE_TIME_MS = 30_000;
export const CUSTOM_TASK_TYPES_STALE_TIME_MS = 5 * 60_000;
