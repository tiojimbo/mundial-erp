import { api } from '@/lib/api';
import type { ApiResponse } from '@/types/api.types';
import type { z } from 'zod';
import type { taskLinkTypeSchema } from '../schemas/task.schema';
import type { TaskLink } from '../types/task.types';

export type TaskLinkType = z.infer<typeof taskLinkTypeSchema>;

interface CreateLinkPayload {
  taskToId: string;
  type: TaskLinkType;
}

interface TaskLinksResponse {
  links: TaskLink[];
}

/**
 * Links (Hoppe-style — HPP-083):
 * - GET    /tasks/:taskId/links                  → { links: [{linkId,type,task}] }
 * - POST   /tasks/:taskId/links  body {taskToId,type}
 * - DELETE /tasks/:taskId/links/:linkId
 */
export const taskLinksService = {
  async list(taskId: string): Promise<TaskLink[]> {
    const { data } = await api.get<ApiResponse<TaskLinksResponse>>(
      `/tasks/${taskId}/links`,
    );
    return data.data.links;
  },

  async create(taskId: string, payload: CreateLinkPayload): Promise<TaskLink> {
    const { data } = await api.post<ApiResponse<TaskLink>>(
      `/tasks/${taskId}/links`,
      payload,
    );
    return data.data;
  },

  async remove(taskId: string, linkId: string): Promise<void> {
    await api.delete(`/tasks/${taskId}/links/${linkId}`);
  },
};
