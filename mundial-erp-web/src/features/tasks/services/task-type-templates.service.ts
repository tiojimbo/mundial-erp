import { api } from '@/lib/api';
import type { ApiResponse } from '@/types/api.types';
import type { TaskTypeTemplateSummary } from '../types/task.types';

/**
 * `GET /task-type-templates` (Felipe — TTT-031) retorna lista enxuta com
 * `id` + `customTaskTypeId` para o frontend detectar quais `CustomTaskType`
 * possuem template configurado (TTT-044).
 *
 * O detalhe completo (fields, attachmentCategories) fica em
 * `GET /task-type-templates/:customTaskTypeId` — vide
 * [`use-task-type-template`](../hooks/use-task-type-template.ts).
 *
 * Backend cacheia em Redis por 5 min; cliente alinha `staleTime` no hook.
 */
export const taskTypeTemplatesService = {
  async list(): Promise<TaskTypeTemplateSummary[]> {
    const { data } = await api.get<ApiResponse<TaskTypeTemplateSummary[]>>(
      '/task-type-templates',
    );
    return data.data;
  },
};
