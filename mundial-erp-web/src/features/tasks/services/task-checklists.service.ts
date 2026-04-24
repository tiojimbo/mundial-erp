import { api } from '@/lib/api';
import type { ApiResponse } from '@/types/api.types';
import type {
  TaskChecklist,
  TaskChecklistItem,
  CreateChecklistDto,
  UpdateChecklistDto,
  CreateChecklistItemDto,
  UpdateChecklistItemDto,
  ReorderChecklistDto,
} from '../types/task.types';

/**
 * Checklists — PLANO-TASKS.md §7.3 e §8.9.
 *
 * Rotas:
 * - GET    /tasks/:taskId/checklists
 * - POST   /tasks/:taskId/checklists
 * - PATCH  /task-checklists/:checklistId
 * - DELETE /task-checklists/:checklistId
 * - POST   /task-checklists/:checklistId/items
 * - PATCH  /task-checklists/:checklistId/items/:itemId
 * - DELETE /task-checklists/:checklistId/items/:itemId
 * - POST   /task-checklists/:checklistId/reorder  body [{id, position}]
 */
export const taskChecklistsService = {
  async list(taskId: string): Promise<TaskChecklist[]> {
    const { data } = await api.get<ApiResponse<TaskChecklist[]>>(
      `/tasks/${taskId}/checklists`,
    );
    return data.data;
  },

  async create(
    taskId: string,
    payload: CreateChecklistDto,
  ): Promise<TaskChecklist> {
    const { data } = await api.post<ApiResponse<TaskChecklist>>(
      `/tasks/${taskId}/checklists`,
      payload,
    );
    return data.data;
  },

  async update(
    checklistId: string,
    payload: UpdateChecklistDto,
  ): Promise<TaskChecklist> {
    const { data } = await api.patch<ApiResponse<TaskChecklist>>(
      `/task-checklists/${checklistId}`,
      payload,
    );
    return data.data;
  },

  async remove(checklistId: string): Promise<void> {
    await api.delete(`/task-checklists/${checklistId}`);
  },

  async createItem(
    checklistId: string,
    payload: CreateChecklistItemDto,
  ): Promise<TaskChecklistItem> {
    const { data } = await api.post<ApiResponse<TaskChecklistItem>>(
      `/task-checklists/${checklistId}/items`,
      payload,
    );
    return data.data;
  },

  async updateItem(
    checklistId: string,
    itemId: string,
    payload: UpdateChecklistItemDto,
  ): Promise<TaskChecklistItem> {
    const { data } = await api.patch<ApiResponse<TaskChecklistItem>>(
      `/task-checklists/${checklistId}/items/${itemId}`,
      payload,
    );
    return data.data;
  },

  async removeItem(checklistId: string, itemId: string): Promise<void> {
    await api.delete(`/task-checklists/${checklistId}/items/${itemId}`);
  },

  async reorder(
    checklistId: string,
    payload: ReorderChecklistDto,
  ): Promise<void> {
    await api.post(`/task-checklists/${checklistId}/reorder`, payload);
  },
};
