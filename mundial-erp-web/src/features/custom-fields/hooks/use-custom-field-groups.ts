import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useWorkspaceStore } from '@/stores/workspace.store';
import {
  customFieldGroupsService,
  type CreateCustomFieldGroupPayload,
  type UpdateCustomFieldGroupPayload,
} from '../services/custom-field-groups.service';
import type { ManagerView } from './use-custom-fields-manager-state';
import type { ManagerCustomFieldGroup } from '../types/custom-field.types';

export const customFieldGroupsQueryKeys = {
  all: (workspaceId: string) => [workspaceId, 'custom-field-groups'] as const,
  list: (workspaceId: string) =>
    [...customFieldGroupsQueryKeys.all(workspaceId), 'list'] as const,
  byTaskType: (workspaceId: string, taskTypeId: string) =>
    [
      ...customFieldGroupsQueryKeys.all(workspaceId),
      'task-type',
      taskTypeId,
    ] as const,
  byList: (workspaceId: string, listId: string) =>
    [...customFieldGroupsQueryKeys.all(workspaceId), 'list', listId] as const,
};

const STALE_MS = 30_000;

export function useCustomFieldGroupsList() {
  const workspaceId = useWorkspaceStore(
    (state) => state.currentWorkspace?.id ?? '',
  );
  return useQuery({
    queryKey: customFieldGroupsQueryKeys.list(workspaceId),
    queryFn: () => customFieldGroupsService.list(),
    enabled: Boolean(workspaceId),
    staleTime: STALE_MS,
  });
}

export function useCustomFieldGroupsByTaskType(taskTypeId: string) {
  const workspaceId = useWorkspaceStore(
    (state) => state.currentWorkspace?.id ?? '',
  );
  return useQuery({
    queryKey: customFieldGroupsQueryKeys.byTaskType(workspaceId, taskTypeId),
    queryFn: () => customFieldGroupsService.listByTaskType(taskTypeId),
    enabled: Boolean(workspaceId) && Boolean(taskTypeId),
    staleTime: STALE_MS,
  });
}

export function useCustomFieldGroupsByList(listId: string) {
  const workspaceId = useWorkspaceStore(
    (state) => state.currentWorkspace?.id ?? '',
  );
  return useQuery({
    queryKey: customFieldGroupsQueryKeys.byList(workspaceId, listId),
    queryFn: () => customFieldGroupsService.listByList(listId),
    enabled: Boolean(workspaceId) && Boolean(listId),
    staleTime: STALE_MS,
  });
}

export function useCustomFieldGroupsForView(view: ManagerView): {
  data: ManagerCustomFieldGroup[];
  isLoading: boolean;
  isError: boolean;
} {
  const listId = view.kind === 'list' ? view.listId : '';
  const taskTypeId = view.kind === 'taskType' ? view.taskTypeId : '';
  const byList = useCustomFieldGroupsByList(listId);
  const byTaskType = useCustomFieldGroupsByTaskType(taskTypeId);

  if (view.kind === 'list') {
    return {
      data: byList.data ?? [],
      isLoading: byList.isLoading,
      isError: byList.isError,
    };
  }
  if (view.kind === 'taskType') {
    return {
      data: byTaskType.data ?? [],
      isLoading: byTaskType.isLoading,
      isError: byTaskType.isError,
    };
  }
  return { data: [], isLoading: false, isError: false };
}

export function useCreateCustomFieldGroup() {
  const qc = useQueryClient();
  const workspaceId = useWorkspaceStore(
    (state) => state.currentWorkspace?.id ?? '',
  );
  return useMutation({
    mutationFn: (payload: CreateCustomFieldGroupPayload) =>
      customFieldGroupsService.create(payload),
    onSuccess: () =>
      qc.invalidateQueries({
        queryKey: customFieldGroupsQueryKeys.all(workspaceId),
      }),
  });
}

export function useUpdateCustomFieldGroup() {
  const qc = useQueryClient();
  const workspaceId = useWorkspaceStore(
    (state) => state.currentWorkspace?.id ?? '',
  );
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: UpdateCustomFieldGroupPayload;
    }) => customFieldGroupsService.update(id, payload),
    onSuccess: () =>
      qc.invalidateQueries({
        queryKey: customFieldGroupsQueryKeys.all(workspaceId),
      }),
  });
}

export function useDeleteCustomFieldGroup() {
  const qc = useQueryClient();
  const workspaceId = useWorkspaceStore(
    (state) => state.currentWorkspace?.id ?? '',
  );
  return useMutation({
    mutationFn: (id: string) => customFieldGroupsService.remove(id),
    onSuccess: () =>
      qc.invalidateQueries({
        queryKey: customFieldGroupsQueryKeys.all(workspaceId),
      }),
  });
}
