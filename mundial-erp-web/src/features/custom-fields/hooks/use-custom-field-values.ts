'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useWorkspaceStore } from '@/stores/workspace.store';
import { customFieldValuesService } from '../services/custom-field-values.service';
import type {
  CustomFieldRawValue,
  CustomFieldValue,
} from '../types/custom-field.types';

export const customFieldValuesQueryKeys = {
  all: (workspaceId: string) =>
    [workspaceId, 'custom-field-values'] as const,
  byTask: (workspaceId: string, taskId: string) =>
    [...customFieldValuesQueryKeys.all(workspaceId), taskId] as const,
};

export const CUSTOM_FIELD_VALUES_STALE_TIME_MS = 30_000;

export function useCustomFieldValues(taskId: string | undefined) {
  const workspaceId = useWorkspaceStore(
    (state) => state.currentWorkspace?.id ?? '',
  );

  return useQuery({
    queryKey: customFieldValuesQueryKeys.byTask(workspaceId, taskId ?? ''),
    queryFn: () => customFieldValuesService.listForTask(taskId as string),
    enabled: Boolean(workspaceId) && Boolean(taskId),
    staleTime: CUSTOM_FIELD_VALUES_STALE_TIME_MS,
  });
}

export interface PatchCustomFieldValueArgs {
  taskId: string;
  customFieldId: string;
  value: CustomFieldRawValue;
}

type PatchContext = {
  previous: CustomFieldValue[] | undefined;
  queryKey: ReturnType<typeof customFieldValuesQueryKeys.byTask>;
};

export function usePatchCustomFieldValue() {
  const qc = useQueryClient();
  const workspaceId = useWorkspaceStore(
    (state) => state.currentWorkspace?.id ?? '',
  );

  return useMutation<
    CustomFieldValue,
    Error,
    PatchCustomFieldValueArgs,
    PatchContext
  >({
    mutationKey: [workspaceId, 'custom-field-values', 'patch'],
    mutationFn: ({ taskId, customFieldId, value }) =>
      customFieldValuesService.setValue(taskId, customFieldId, value),

    onMutate: async ({ taskId, customFieldId, value }) => {
      const queryKey = customFieldValuesQueryKeys.byTask(workspaceId, taskId);
      await qc.cancelQueries({ queryKey });

      const previous = qc.getQueryData<CustomFieldValue[]>(queryKey);

      if (previous) {
        const optimistic = previous.map((entry) =>
          entry.customFieldId === customFieldId
            ? {
                ...entry,
                value: toScalarOptimistic(value, entry),
                updatedAt: new Date().toISOString(),
              }
            : entry,
        );
        qc.setQueryData<CustomFieldValue[]>(queryKey, optimistic);
      }

      return { previous, queryKey };
    },

    onError: (err, _vars, ctx) => {
      if (ctx?.previous && ctx.queryKey) {
        qc.setQueryData(ctx.queryKey, ctx.previous);
      }
      toast.error(err.message || 'Erro ao atualizar campo personalizado');
    },

    onSuccess: (server, { taskId }) => {
      const queryKey = customFieldValuesQueryKeys.byTask(workspaceId, taskId);
      const current = qc.getQueryData<CustomFieldValue[]>(queryKey);
      if (!current) return;

      const exists = current.some((entry) => entry.id === server.id);
      const next = exists
        ? current.map((entry) => (entry.id === server.id ? server : entry))
        : [...current, server];

      qc.setQueryData<CustomFieldValue[]>(queryKey, next);
    },

    onSettled: (_data, _err, { taskId }) => {
      qc.invalidateQueries({
        queryKey: customFieldValuesQueryKeys.byTask(workspaceId, taskId),
      });
    },
  });
}

export function useClearCustomFieldValue() {
  const qc = useQueryClient();
  const workspaceId = useWorkspaceStore(
    (state) => state.currentWorkspace?.id ?? '',
  );

  return useMutation({
    mutationFn: ({
      taskId,
      customFieldId,
    }: {
      taskId: string;
      customFieldId: string;
    }) => customFieldValuesService.clearValue(taskId, customFieldId),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({
        queryKey: customFieldValuesQueryKeys.byTask(workspaceId, vars.taskId),
      });
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Erro ao limpar campo personalizado');
    },
  });
}

function toScalarOptimistic(
  value: CustomFieldRawValue,
  reference: CustomFieldValue,
): CustomFieldValue['value'] {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'boolean') return String(value);
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return value;
  return reference.value;
}
