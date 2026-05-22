import { api } from '@/lib/api';
import type { ApiResponse, PaginatedResponse } from '@/types/api.types';
import type { TaskTag, CreateTagDto, UpdateTagDto } from '../types/task.types';

/**
 * Tags (Hoppe — HPP-085/086):
 * - GET    /tags                       (list)
 * - POST   /tags                       (create, spaceId obrigatorio)
 * - PUT    /tags/:id                   (update)
 * - DELETE /tags/:id                   (delete)
 * - POST   /tags/task/:taskId          body { tagId } (attach)
 * - DELETE /tags/task/:taskId/:tagId   (detach)
 */
export const taskTagsService = {
  async list(): Promise<TaskTag[]> {
    const { data } = await api.get<PaginatedResponse<TaskTag>>('/tags');
    return data.data;
  },

  async create(payload: CreateTagDto): Promise<TaskTag> {
    const { data } = await api.post<ApiResponse<TaskTag>>('/tags', payload);
    return data.data;
  },

  async update(tagId: string, payload: UpdateTagDto): Promise<TaskTag> {
    const { data } = await api.put<ApiResponse<TaskTag>>(
      `/tags/${tagId}`,
      payload,
    );
    return data.data;
  },

  async remove(tagId: string): Promise<void> {
    await api.delete(`/tags/${tagId}`);
  },

  async attach(taskId: string, tagId: string): Promise<void> {
    await api.post(`/tags/task/${taskId}`, { tagId });
  },

  async detach(taskId: string, tagId: string): Promise<void> {
    await api.delete(`/tags/task/${taskId}/${tagId}`);
  },
};
