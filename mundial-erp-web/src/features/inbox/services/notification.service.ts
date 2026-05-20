import { api } from '@/lib/api';
import type { ApiResponse } from '@/types/api.types';
import type {
  InboxView,
  NotificationsResponse,
  SnoozePayload,
  BulkActionPayload,
} from '../types/notification.types';

export type GetNotificationsParams = {
  view?: InboxView;
  page?: number;
  limit?: number;
};

export const notificationService = {
  async getNotifications({
    view = 'all',
    page = 1,
    limit = 20,
  }: GetNotificationsParams = {}): Promise<NotificationsResponse> {
    const skip = Math.max(0, (page - 1) * limit);
    const { data } = await api.get<ApiResponse<NotificationsResponse>>(
      '/notifications',
      { params: { view, skip, limit } },
    );
    return data.data;
  },

  async markAsRead(id: string): Promise<void> {
    await api.post(`/notifications/${id}/read`);
  },

  async markAsUnread(id: string): Promise<void> {
    await api.post(`/notifications/${id}/unread`);
  },

  async clearNotification(id: string): Promise<void> {
    await api.post(`/notifications/${id}/clear`);
  },

  async unclearNotification(id: string): Promise<void> {
    await api.post(`/notifications/${id}/unclear`);
  },

  async snoozeNotification(id: string, payload: SnoozePayload): Promise<void> {
    await api.post(`/notifications/${id}/snooze`, payload);
  },

  async unsnoozeNotification(id: string): Promise<void> {
    await api.post(`/notifications/${id}/unsnooze`);
  },

  async deleteNotification(id: string): Promise<void> {
    await api.delete(`/notifications/${id}`);
  },

  async markAllRead(payload: BulkActionPayload): Promise<void> {
    await api.post('/notifications/read-all', payload);
  },

  async clearAll(payload: BulkActionPayload): Promise<void> {
    await api.post('/notifications/clear-all', payload);
  },

  async deleteAllCleared(): Promise<void> {
    await api.post('/notifications/delete-all-cleared');
  },
};
