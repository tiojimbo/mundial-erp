import { api } from '@/lib/api';
import type { ApiResponse } from '@/types/api.types';
import type {
  InboxView,
  Notification,
  NotificationsResponse,
  SnoozePayload,
  BulkActionPayload,
} from '../types/notification.types';

export const notificationService = {
  async getNotifications(view: InboxView): Promise<NotificationsResponse> {
    const { data } = await api.get<ApiResponse<NotificationsResponse>>(
      '/notifications',
      { params: { view } },
    );
    return data.data;
  },

  async markAsRead(id: string): Promise<Notification> {
    const { data } = await api.patch<ApiResponse<Notification>>(
      `/notifications/${id}/read`,
    );
    return data.data;
  },

  async markAsUnread(id: string): Promise<Notification> {
    const { data } = await api.patch<ApiResponse<Notification>>(
      `/notifications/${id}/unread`,
    );
    return data.data;
  },

  async clearNotification(id: string): Promise<Notification> {
    const { data } = await api.patch<ApiResponse<Notification>>(
      `/notifications/${id}/clear`,
    );
    return data.data;
  },

  async unclearNotification(id: string): Promise<Notification> {
    const { data } = await api.patch<ApiResponse<Notification>>(
      `/notifications/${id}/unclear`,
    );
    return data.data;
  },

  async snoozeNotification(
    id: string,
    payload: SnoozePayload,
  ): Promise<Notification> {
    const { data } = await api.patch<ApiResponse<Notification>>(
      `/notifications/${id}/snooze`,
      payload,
    );
    return data.data;
  },

  async unsnoozeNotification(id: string): Promise<Notification> {
    const { data } = await api.patch<ApiResponse<Notification>>(
      `/notifications/${id}/unsnooze`,
    );
    return data.data;
  },

  async markAllRead(payload: BulkActionPayload): Promise<void> {
    await api.post('/notifications/mark-all-read', payload);
  },

  async clearAll(payload: BulkActionPayload): Promise<void> {
    await api.post('/notifications/clear-all', payload);
  },

  async deleteAllCleared(): Promise<void> {
    await api.delete('/notifications/cleared');
  },
};
