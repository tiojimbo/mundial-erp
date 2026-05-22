import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  customTaskTypesService,
  type CreateCustomTaskTypePayload,
  type UpdateCustomTaskTypePayload,
} from '../services/custom-task-types.service';
import type { CustomTaskType } from '../types/task.types';

export const CUSTOM_TASK_TYPES_QUERY_KEY = ['custom-task-types'] as const;
const WORKSPACE_TASK_TYPES_INVALIDATE = ['workspace-task-types'] as const;

const FIVE_MINUTES_IN_MS = 5 * 60 * 1000;

export function useCustomTaskTypes() {
  return useQuery({
    queryKey: CUSTOM_TASK_TYPES_QUERY_KEY,
    queryFn: () => customTaskTypesService.list(),
    staleTime: FIVE_MINUTES_IN_MS,
  });
}

function invalidateAll(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: CUSTOM_TASK_TYPES_QUERY_KEY });
  qc.invalidateQueries({ queryKey: WORKSPACE_TASK_TYPES_INVALIDATE });
}

export function useCreateCustomTaskType() {
  const qc = useQueryClient();
  return useMutation<
    CustomTaskType,
    Error,
    { spaceId: string | null; payload: CreateCustomTaskTypePayload }
  >({
    mutationFn: ({ spaceId, payload }) =>
      customTaskTypesService.create(spaceId, payload),
    onSuccess: () => invalidateAll(qc),
  });
}

export function useUpdateCustomTaskType() {
  const qc = useQueryClient();
  return useMutation<
    CustomTaskType,
    Error,
    {
      spaceId: string | null;
      taskTypeId: string;
      payload: UpdateCustomTaskTypePayload;
    }
  >({
    mutationFn: ({ spaceId, taskTypeId, payload }) =>
      customTaskTypesService.update(spaceId, taskTypeId, payload),
    onSuccess: () => invalidateAll(qc),
  });
}

export function useDeleteCustomTaskType() {
  const qc = useQueryClient();
  return useMutation<
    void,
    Error,
    { spaceId: string | null; taskTypeId: string }
  >({
    mutationFn: ({ spaceId, taskTypeId }) =>
      customTaskTypesService.remove(spaceId, taskTypeId),
    onSuccess: () => invalidateAll(qc),
  });
}
