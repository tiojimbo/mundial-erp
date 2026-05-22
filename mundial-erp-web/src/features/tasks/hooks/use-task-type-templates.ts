'use client';

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { taskTypeTemplatesService } from '../services/task-type-templates.service';
import type { TaskTypeTemplateSummary } from '../types/task.types';

/**
 * TTT-044 — Lista enxuta de templates do workspace
 * (`GET /task-type-templates`). Usado em `/settings/custom-task-types`
 * para exibir badge "Template" nos `CustomTaskType` que possuem template.
 *
 * `staleTime` 5min alinhado ao cache Redis do backend (PLANO §AC TTT-031).
 */
export const TASK_TYPE_TEMPLATES_QUERY_KEY = ['task-type-templates'] as const;

const TASK_TYPE_TEMPLATES_STALE_TIME_MS = 5 * 60 * 1000;

export function useTaskTypeTemplates(): UseQueryResult<
  TaskTypeTemplateSummary[],
  Error
> {
  return useQuery<TaskTypeTemplateSummary[], Error>({
    queryKey: TASK_TYPE_TEMPLATES_QUERY_KEY,
    queryFn: () => taskTypeTemplatesService.list(),
    staleTime: TASK_TYPE_TEMPLATES_STALE_TIME_MS,
  });
}
