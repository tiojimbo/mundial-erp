import { api } from '@/lib/api';
import type { ApiResponse } from '@/types/api.types';
import type { TaskStatus } from '@/features/tasks/types/task.types';
import type { StatusType } from '../types/status.types';

export type CreateStatusPayload = {
  type: StatusType;
  name: string;
  color: string;
  position: number;
  listId?: string;
  folderId?: string;
  spaceId?: string;
};

export type UpdateStatusPayload = {
  id: string;
  type?: StatusType;
  name?: string;
  color?: string;
  position?: number;
};

export type StatusRequiredField = {
  id: string;
  statusId: string;
  customFieldId: string;
  createdAt: string;
  updatedAt: string;
  customField: {
    id: string;
    name: string;
    type: string;
    label: string;
  };
};

export const statusesService = {
  async findByList(listId: string): Promise<TaskStatus[]> {
    const { data: envelope } = await api.get<ApiResponse<TaskStatus[]>>(
      `/status/list/${listId}`,
    );
    return envelope.data;
  },

  async findById(id: string): Promise<TaskStatus> {
    const { data: envelope } = await api.get<ApiResponse<TaskStatus>>(
      `/status/${id}`,
    );
    return envelope.data;
  },

  async create(payload: CreateStatusPayload): Promise<TaskStatus> {
    const { data: envelope } = await api.post<ApiResponse<TaskStatus>>(
      `/status`,
      payload,
    );
    return envelope.data;
  },

  async update(
    id: string,
    payload: Omit<UpdateStatusPayload, 'id'>,
  ): Promise<TaskStatus> {
    const { data: envelope } = await api.put<ApiResponse<TaskStatus>>(
      `/status/${id}`,
      { id, ...payload },
    );
    return envelope.data;
  },

  async remove(id: string): Promise<TaskStatus> {
    const { data: envelope } = await api.delete<ApiResponse<TaskStatus>>(
      `/status/${id}`,
    );
    return envelope.data;
  },

  async getRequiredFields(statusId: string): Promise<StatusRequiredField[]> {
    const { data: envelope } = await api.get<
      ApiResponse<StatusRequiredField[]>
    >(`/status/${statusId}/required-fields`);
    return envelope.data;
  },

  async setRequiredFields(
    statusId: string,
    customFieldIds: string[],
  ): Promise<StatusRequiredField[]> {
    const { data: envelope } = await api.put<
      ApiResponse<StatusRequiredField[]>
    >(`/status/${statusId}/required-fields`, { customFieldIds });
    return envelope.data;
  },
};
