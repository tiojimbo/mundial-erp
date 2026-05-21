'use client';

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { ApiResponse } from '@/types/api.types';
import type {
  CustomFieldDefinition,
  CustomFieldType,
} from '@/features/custom-fields/types/custom-field.types';

/**
 * Sprint 4 (TTT-041) — Hook de leitura do template de um CustomTaskType.
 *
 * Endpoint: `GET /task-type-templates/:customTaskTypeId` (Felipe — TTT-031).
 *
 * Contrato congelado (PLANO §"Interface contratual M1↔M2"):
 *   - Retorna `null` quando `customTaskTypeId` e nulo/indefinido (task sem
 *     tipo customizado e/ou tipo sem template — chamada nem dispara).
 *   - 404 do backend (flag M2 OFF ou tipo sem template) e tratado pelo
 *     consumidor como "sem template" — `useTaskTypeTemplate` propaga o
 *     erro normalmente; a Task View interpreta `template` ausente como
 *     fallback "todas custom fields visiveis".
 *
 * `staleTime` 5min alinhado com cache Redis do backend (PLANO §AC TTT-031).
 * `queryKey` inclui `workspaceId` para isolamento entre tenants — mesmo
 * padrao adotado em `customFieldDefinitionsQueryKeys`.
 */

/**
 * Subset projetado de `CustomFieldDefinition` exposto pelo backend dentro
 * do template — sem `workspaceId` por motivo de seguranca (vide DTO
 * `TaskTypeTemplateFieldDefinitionDto`). Para o detalhe completo, o
 * cliente deve bater em `GET /custom-field-definitions/:id`.
 */
export type TaskTypeTemplateFieldDefinition = Pick<
  CustomFieldDefinition,
  'id' | 'name' | 'label' | 'required' | 'config' | 'position' | 'fixed'
> & {
  type: CustomFieldType;
};

export interface TaskTypeTemplateAttachmentCategory {
  slug: string;
  label: string;
  required: boolean;
  mimeWhitelist?: string[];
}

export interface TaskTypeTemplateField {
  definitionId: string;
  sortOrder: number;
  requiredOverride: boolean | null;
  definition: TaskTypeTemplateFieldDefinition;
}

export interface TaskTypeTemplate {
  id: string;
  customTaskTypeId: string;
  attachmentCategories: TaskTypeTemplateAttachmentCategory[] | null;
  defaultDescriptionBlocks: Record<string, unknown> | null;
  fields: TaskTypeTemplateField[];
  createdAt: string;
  updatedAt: string;
}

export const taskTypeTemplateQueryKey = (
  workspaceId: string,
  customTaskTypeId: string | null | undefined,
) => ['task-type-template', workspaceId, customTaskTypeId ?? null] as const;

const TASK_TYPE_TEMPLATE_STALE_TIME_MS = 5 * 60 * 1000;

export function useTaskTypeTemplate(
  customTaskTypeId: string | null | undefined,
  workspaceId: string,
): UseQueryResult<TaskTypeTemplate | null, Error> {
  return useQuery<TaskTypeTemplate | null, Error>({
    queryKey: taskTypeTemplateQueryKey(workspaceId, customTaskTypeId),
    queryFn: async () => {
      if (!customTaskTypeId) return null;
      const { data } = await api.get<ApiResponse<TaskTypeTemplate>>(
        `/task-type-templates/${customTaskTypeId}`,
      );
      return data.data;
    },
    enabled: Boolean(customTaskTypeId) && Boolean(workspaceId),
    staleTime: TASK_TYPE_TEMPLATE_STALE_TIME_MS,
    // 404 = "tipo sem template" / flag OFF: nao retentar.
    retry: (failureCount, error) => {
      const status = (error as { response?: { status?: number } })?.response
        ?.status;
      if (status === 404) return false;
      return failureCount < 1;
    },
  });
}
