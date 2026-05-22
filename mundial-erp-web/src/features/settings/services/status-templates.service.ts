import { api } from '@/lib/api';
import type { ApiResponse } from '@/types/api.types';
import type { StatusType } from '../types/status.types';

export type StatusTemplateItem = {
  name: string;
  type: StatusType;
  color: string;
  position: number;
};

export type StatusTemplate = {
  id: string;
  name: string;
  statuses: StatusTemplateItem[];
  workspaceId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateStatusTemplatePayload = {
  name: string;
  statuses: StatusTemplateItem[];
};

export const statusTemplatesService = {
  async findAll(): Promise<StatusTemplate[]> {
    const { data: envelope } =
      await api.get<ApiResponse<StatusTemplate[]>>(`/status-templates`);
    return envelope.data;
  },

  async create(payload: CreateStatusTemplatePayload): Promise<StatusTemplate> {
    const { data: envelope } = await api.post<ApiResponse<StatusTemplate>>(
      `/status-templates`,
      payload,
    );
    return envelope.data;
  },

  async remove(id: string): Promise<StatusTemplate> {
    const { data: envelope } = await api.delete<ApiResponse<StatusTemplate>>(
      `/status-templates/${id}`,
    );
    return envelope.data;
  },
};
