import { api } from '@/lib/api';
import type { ApiResponse } from '@/types/api.types';
import type {
  AddCustomFieldLocationPayload,
  CreateCustomFieldDefinitionPayload,
  CustomFieldDefinition,
  CustomFieldDefinitionsScope,
  CustomFieldLocationType,
  CustomFieldsGroupedResponse,
  ManagerCustomFieldGroup,
  ManagerCustomFieldItem,
  ManagerScope,
  UpdateCustomFieldDefinitionPayload,
} from '../types/custom-field.types';

function buildScopeParams(scope?: CustomFieldDefinitionsScope) {
  if (!scope) return undefined;
  const params: Record<string, string> = {};
  if (scope.spaceId) params.spaceId = scope.spaceId;
  if (scope.folderId) params.folderId = scope.folderId;
  if (scope.listId) params.listId = scope.listId;
  if (scope.taskTypeId) params.taskTypeId = scope.taskTypeId;
  return Object.keys(params).length > 0 ? params : undefined;
}

export const customFieldDefinitionsService = {
  async listGrouped(
    scope?: CustomFieldDefinitionsScope,
  ): Promise<CustomFieldsGroupedResponse> {
    const { data } = await api.get<ApiResponse<CustomFieldsGroupedResponse>>(
      '/custom-fields',
      { params: buildScopeParams(scope) },
    );
    return data.data;
  },

  async findOne(id: string): Promise<CustomFieldDefinition> {
    const { data } = await api.get<ApiResponse<CustomFieldDefinition>>(
      `/custom-fields/${id}`,
    );
    return data.data;
  },

  async manager(
    scope: ManagerScope,
    targetId?: string,
  ): Promise<ManagerCustomFieldItem[]> {
    const params: Record<string, string> = { scope };
    if (targetId) {
      if (scope === 'taskType') params.taskTypeId = targetId;
      if (scope === 'list') params.listId = targetId;
      if (scope === 'folder') params.folderId = targetId;
      if (scope === 'space') params.spaceId = targetId;
    }
    const { data } = await api.get<ApiResponse<ManagerCustomFieldItem[]>>(
      '/custom-fields/manager',
      { params },
    );
    return data.data;
  },

  async groupsByTaskType(
    taskTypeId: string,
  ): Promise<ManagerCustomFieldGroup[]> {
    const { data } = await api.get<ApiResponse<ManagerCustomFieldGroup[]>>(
      `/custom-fields/groups/task-type/${taskTypeId}`,
    );
    return data.data;
  },

  async create(
    payload: CreateCustomFieldDefinitionPayload,
  ): Promise<CustomFieldDefinition> {
    const { data } = await api.post<ApiResponse<CustomFieldDefinition>>(
      '/custom-fields',
      payload,
    );
    return data.data;
  },

  async update(
    id: string,
    payload: UpdateCustomFieldDefinitionPayload,
  ): Promise<CustomFieldDefinition> {
    const { data } = await api.put<ApiResponse<CustomFieldDefinition>>(
      `/custom-fields/${id}`,
      payload,
    );
    return data.data;
  },

  async remove(id: string): Promise<CustomFieldDefinition> {
    const { data } = await api.delete<ApiResponse<CustomFieldDefinition>>(
      `/custom-fields/${id}`,
    );
    return data.data;
  },

  async addToLocation(
    payload: AddCustomFieldLocationPayload,
  ): Promise<CustomFieldDefinition> {
    const { data } = await api.post<ApiResponse<CustomFieldDefinition>>(
      '/custom-fields/location',
      payload,
    );
    return data.data;
  },

  async removeFromLocation(
    customFieldId: string,
    locationType: CustomFieldLocationType,
    locationId: string,
  ): Promise<CustomFieldDefinition> {
    const { data } = await api.delete<ApiResponse<CustomFieldDefinition>>(
      `/custom-fields/${customFieldId}/location`,
      { params: { locationType, locationId } },
    );
    return data.data;
  },
};
