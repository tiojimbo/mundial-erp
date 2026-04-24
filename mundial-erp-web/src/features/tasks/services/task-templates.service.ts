import { api } from '@/lib/api';
import type { ApiResponse, PaginatedResponse } from '@/types/api.types';
import type {
  TaskTemplate,
  CreateTemplateDto,
  UpdateTemplateDto,
  Task,
} from '../types/task.types';

/**
 * Templates — PLANO-TASKS.md §7.3 e §7.2 (instantiate).
 *
 * Rotas:
 * - GET    /task-templates
 * - POST   /task-templates
 * - PATCH  /task-templates/:templateId
 * - DELETE /task-templates/:templateId
 * - POST   /task-templates/:templateId/snapshot?fromTaskId=                (gera a partir de Task)
 * - POST   /processes/:processId/task-templates/:templateId/instances      (instancia)
 */
export const taskTemplatesService = {
  async list(): Promise<TaskTemplate[]> {
    const { data } = await api.get<PaginatedResponse<TaskTemplate>>(
      '/task-templates',
    );
    return data.data;
  },

  async getById(templateId: string): Promise<TaskTemplate> {
    const { data } = await api.get<ApiResponse<TaskTemplate>>(
      `/task-templates/${templateId}`,
    );
    return data.data;
  },

  async create(payload: CreateTemplateDto): Promise<TaskTemplate> {
    const { data } = await api.post<ApiResponse<TaskTemplate>>(
      '/task-templates',
      payload,
    );
    return data.data;
  },

  async update(
    templateId: string,
    payload: UpdateTemplateDto,
  ): Promise<TaskTemplate> {
    const { data } = await api.patch<ApiResponse<TaskTemplate>>(
      `/task-templates/${templateId}`,
      payload,
    );
    return data.data;
  },

  async remove(templateId: string): Promise<void> {
    await api.delete(`/task-templates/${templateId}`);
  },

  async snapshot(
    templateId: string,
    fromTaskId: string,
  ): Promise<TaskTemplate> {
    const { data } = await api.post<ApiResponse<TaskTemplate>>(
      `/task-templates/${templateId}/snapshot`,
      null,
      { params: { fromTaskId } },
    );
    return data.data;
  },

  async instantiate(
    processId: string,
    templateId: string,
  ): Promise<Task> {
    const { data } = await api.post<ApiResponse<Task>>(
      `/processes/${processId}/task-templates/${templateId}/instances`,
    );
    return data.data;
  },
};
