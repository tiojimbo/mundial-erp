import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import {
  workflowStatusesService,
  type CreateWorkflowStatusPayload,
  type UpdateWorkflowStatusPayload,
  type ReorderWorkflowStatusItem,
} from '../services/workflow-statuses.service';

export const WORKFLOW_STATUSES_KEY = ['workflow-statuses'];

export function useWorkflowStatuses(departmentId: string, areaId?: string) {
  return useQuery({
    queryKey: [...WORKFLOW_STATUSES_KEY, departmentId, areaId ?? null],
    queryFn: () =>
      workflowStatusesService.getByDepartment(departmentId, areaId),
    enabled: !!departmentId,
  });
}

export function useCreateWorkflowStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateWorkflowStatusPayload) =>
      workflowStatusesService.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: WORKFLOW_STATUSES_KEY });
    },
  });
}

export function useUpdateWorkflowStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }: UpdateWorkflowStatusPayload & { id: string }) =>
      workflowStatusesService.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: WORKFLOW_STATUSES_KEY });
    },
  });
}

export function useDeleteWorkflowStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, migrateToStatusId }: { id: string; migrateToStatusId?: string }) =>
      workflowStatusesService.remove(id, migrateToStatusId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: WORKFLOW_STATUSES_KEY });
    },
  });
}

export function useReorderWorkflowStatuses() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (items: ReorderWorkflowStatusItem[]) =>
      workflowStatusesService.reorder(items),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: WORKFLOW_STATUSES_KEY });
    },
  });
}
