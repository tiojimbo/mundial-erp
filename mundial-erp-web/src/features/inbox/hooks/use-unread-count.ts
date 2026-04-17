import { useQuery } from '@tanstack/react-query';
import { notificationService } from '../services/notification.service';
import { NOTIFICATIONS_KEY } from './use-notifications';

/**
 * Returns the total unread notification count for the sidebar badge.
 * Shares the same query key prefix as useNotifications so mutations
 * that call `invalidateQueries({ queryKey: NOTIFICATIONS_KEY })`
 * will automatically keep this count in sync.
 */
export function useUnreadCount() {
  return useQuery({
    queryKey: [...NOTIFICATIONS_KEY, 'unread-count'],
    queryFn: async () => {
      const res = await notificationService.getNotifications('all');
      return res.counts?.all ?? 0;
    },
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
    staleTime: 30_000,
  });
}
