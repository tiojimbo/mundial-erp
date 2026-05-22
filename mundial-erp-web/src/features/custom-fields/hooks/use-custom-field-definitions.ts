import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useWorkspaceStore } from '@/stores/workspace.store';
import { customFieldDefinitionsService } from '../services/custom-field-definitions.service';
import type {
  AddCustomFieldLocationPayload,
  CreateCustomFieldDefinitionPayload,
  CustomFieldDefinitionsScope,
  CustomFieldLocationType,
  ManagerScope,
  UpdateCustomFieldDefinitionPayload,
} from '../types/custom-field.types';

export const customFieldDefinitionsQueryKeys = {
  all: (workspaceId: string) =>
    [workspaceId, 'custom-field-definitions'] as const,
  list: (workspaceId: string, scope?: CustomFieldDefinitionsScope) =>
    [
      ...customFieldDefinitionsQueryKeys.all(workspaceId),
      'list',
      scope ?? {},
    ] as const,
  manager: (workspaceId: string, scope: ManagerScope, targetId?: string) =>
    [
      ...customFieldDefinitionsQueryKeys.all(workspaceId),
      'manager',
      scope,
      targetId ?? '',
    ] as const,
  groups: (workspaceId: string, taskTypeId: string) =>
    [
      ...customFieldDefinitionsQueryKeys.all(workspaceId),
      'groups',
      'task-type',
      taskTypeId,
    ] as const,
};

export const CUSTOM_FIELD_DEFINITIONS_STALE_TIME_MS = 30_000;

export function useCustomFieldDefinitions(scope?: CustomFieldDefinitionsScope) {
  const workspaceId = useWorkspaceStore(
    (state) => state.currentWorkspace?.id ?? '',
  );

  return useQuery({
    queryKey: customFieldDefinitionsQueryKeys.list(workspaceId, scope),
    queryFn: () => customFieldDefinitionsService.listGrouped(scope),
    enabled: Boolean(workspaceId),
    staleTime: CUSTOM_FIELD_DEFINITIONS_STALE_TIME_MS,
  });
}

export function useCustomFieldsManager(scope: ManagerScope, targetId?: string) {
  const workspaceId = useWorkspaceStore(
    (state) => state.currentWorkspace?.id ?? '',
  );
  const targetRequired =
    scope === 'list' || scope === 'folder' || scope === 'space';
  return useQuery({
    queryKey: customFieldDefinitionsQueryKeys.manager(
      workspaceId,
      scope,
      targetId,
    ),
    queryFn: () => customFieldDefinitionsService.manager(scope, targetId),
    enabled: Boolean(workspaceId) && (!targetRequired || Boolean(targetId)),
    staleTime: CUSTOM_FIELD_DEFINITIONS_STALE_TIME_MS,
  });
}

export function useCustomFieldGroups(taskTypeId: string) {
  const workspaceId = useWorkspaceStore(
    (state) => state.currentWorkspace?.id ?? '',
  );
  return useQuery({
    queryKey: customFieldDefinitionsQueryKeys.groups(workspaceId, taskTypeId),
    queryFn: () => customFieldDefinitionsService.groupsByTaskType(taskTypeId),
    enabled: Boolean(workspaceId) && Boolean(taskTypeId),
    staleTime: CUSTOM_FIELD_DEFINITIONS_STALE_TIME_MS,
  });
}

export function useCreateCustomField() {
  const qc = useQueryClient();
  const workspaceId = useWorkspaceStore(
    (state) => state.currentWorkspace?.id ?? '',
  );
  return useMutation({
    mutationFn: (payload: CreateCustomFieldDefinitionPayload) =>
      customFieldDefinitionsService.create(payload),
    onSuccess: () =>
      qc.invalidateQueries({
        queryKey: customFieldDefinitionsQueryKeys.all(workspaceId),
      }),
  });
}

export function useUpdateCustomField() {
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
      payload: UpdateCustomFieldDefinitionPayload;
    }) => customFieldDefinitionsService.update(id, payload),
    onSuccess: () =>
      qc.invalidateQueries({
        queryKey: customFieldDefinitionsQueryKeys.all(workspaceId),
      }),
  });
}

export function useDeleteCustomField() {
  const qc = useQueryClient();
  const workspaceId = useWorkspaceStore(
    (state) => state.currentWorkspace?.id ?? '',
  );
  return useMutation({
    mutationFn: (id: string) => customFieldDefinitionsService.remove(id),
    onSuccess: () =>
      qc.invalidateQueries({
        queryKey: customFieldDefinitionsQueryKeys.all(workspaceId),
      }),
  });
}

export function useAddCustomFieldLocation() {
  const qc = useQueryClient();
  const workspaceId = useWorkspaceStore(
    (state) => state.currentWorkspace?.id ?? '',
  );
  return useMutation({
    mutationFn: (payload: AddCustomFieldLocationPayload) =>
      customFieldDefinitionsService.addToLocation(payload),
    onSuccess: () =>
      qc.invalidateQueries({
        queryKey: customFieldDefinitionsQueryKeys.all(workspaceId),
      }),
  });
}

export function useRemoveCustomFieldLocation() {
  const qc = useQueryClient();
  const workspaceId = useWorkspaceStore(
    (state) => state.currentWorkspace?.id ?? '',
  );
  return useMutation({
    mutationFn: ({
      customFieldId,
      locationType,
      locationId,
    }: {
      customFieldId: string;
      locationType: CustomFieldLocationType;
      locationId: string;
    }) =>
      customFieldDefinitionsService.removeFromLocation(
        customFieldId,
        locationType,
        locationId,
      ),
    onSuccess: () =>
      qc.invalidateQueries({
        queryKey: customFieldDefinitionsQueryKeys.all(workspaceId),
      }),
  });
}
