import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  customTaskTypesService,
  type CreateCustomTaskTypePayload,
} from '../services/custom-task-types.service';
import type { CustomTaskType } from '../types/task.types';

export const CUSTOM_TASK_TYPES_QUERY_KEY = ['custom-task-types'] as const;

const FIVE_MINUTES_IN_MS = 5 * 60 * 1000;

/**
 * Backend cacheia em Redis por 5 min (PLANO §7.3), cliente assume staleTime ~ 5 min.
 */
export function useCustomTaskTypes() {
  return useQuery({
    queryKey: CUSTOM_TASK_TYPES_QUERY_KEY,
    queryFn: () => customTaskTypesService.list(),
    staleTime: FIVE_MINUTES_IN_MS,
  });
}

export function useCreateCustomTaskType() {
  const queryClient = useQueryClient();
  return useMutation<CustomTaskType, Error, CreateCustomTaskTypePayload>({
    mutationFn: (payload) => customTaskTypesService.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CUSTOM_TASK_TYPES_QUERY_KEY });
    },
  });
}
