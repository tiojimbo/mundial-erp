import { api } from '@/lib/api';
import type { ApiResponse } from '@/types/api.types';
import type {
  TaskChecklist,
  TaskChecklistItem,
  CreateChecklistDto,
  UpdateChecklistDto,
  CreateChecklistItemDto,
  UpdateChecklistItemDto,
} from '../types/task.types';

/**
 * Checklists — paths Hoppe (Sprint 5 HPP-080/081/082):
 * - GET    /checklist/task/:taskId
 * - POST   /checklist/task/:taskId
 * - PUT    /checklist/:id
 * - DELETE /checklist/:id
 * - POST   /checklist/item/:checklistId
 * - PUT    /checklist/:checklistId/item/:itemId
 * - DELETE /checklist/item/:itemId
 *
 * Reorder foi removido — feito agora via PUT item-a-item com `position`.
 */
export const taskChecklistsService = {
  async list(taskId: string): Promise<TaskChecklist[]> {
    const { data } = await api.get<ApiResponse<TaskChecklist[]>>(
      `/checklist/task/${taskId}`,
    );
    return data.data;
  },

  async create(
    taskId: string,
    payload: CreateChecklistDto,
  ): Promise<TaskChecklist> {
    const { data } = await api.post<ApiResponse<TaskChecklist>>(
      `/checklist/task/${taskId}`,
      payload,
    );
    return data.data;
  },

  async update(
    checklistId: string,
    payload: UpdateChecklistDto,
  ): Promise<TaskChecklist> {
    const { data } = await api.put<ApiResponse<TaskChecklist>>(
      `/checklist/${checklistId}`,
      payload,
    );
    return data.data;
  },

  async remove(checklistId: string): Promise<void> {
    await api.delete(`/checklist/${checklistId}`);
  },

  async createItem(
    checklistId: string,
    payload: CreateChecklistItemDto,
  ): Promise<TaskChecklistItem> {
    const { data } = await api.post<ApiResponse<TaskChecklistItem>>(
      `/checklist/item/${checklistId}`,
      payload,
    );
    return data.data;
  },

  async updateItem(
    checklistId: string,
    itemId: string,
    payload: UpdateChecklistItemDto,
  ): Promise<TaskChecklistItem> {
    const { data } = await api.put<ApiResponse<TaskChecklistItem>>(
      `/checklist/${checklistId}/item/${itemId}`,
      payload,
    );
    return data.data;
  },

  async removeItem(itemId: string): Promise<void> {
    await api.delete(`/checklist/item/${itemId}`);
  },
};
