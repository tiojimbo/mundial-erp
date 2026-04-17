import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { notificationService } from '../services/notification.service';
import type {
  InboxView,
  NotificationsResponse,
  SnoozePayload,
  BulkActionPayload,
} from '../types/notification.types';

export const NOTIFICATIONS_KEY = ['notifications'];

export function useNotifications(view: InboxView) {
  return useQuery({
    queryKey: [...NOTIFICATIONS_KEY, view],
    queryFn: () => notificationService.getNotifications(view),
    refetchOnWindowFocus: true,
    staleTime: 30_000,
  });
}

export function useMarkAsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => notificationService.markAsRead(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: NOTIFICATIONS_KEY });
      const previousData = qc.getQueriesData<NotificationsResponse>({
        queryKey: NOTIFICATIONS_KEY,
      });
      qc.setQueriesData<NotificationsResponse>(
        { queryKey: NOTIFICATIONS_KEY },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            items: old.items.map((n) =>
              n.id === id
                ? { ...n, status: 'read' as const, readAt: new Date().toISOString() }
                : n,
            ),
          };
        },
      );
      return { previousData };
    },
    onError: (_err, _id, context) => {
      context?.previousData?.forEach(([key, data]) => {
        qc.setQueryData(key, data);
      });
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: NOTIFICATIONS_KEY });
    },
  });
}

export function useMarkAsUnread() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => notificationService.markAsUnread(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: NOTIFICATIONS_KEY });
      const previousData = qc.getQueriesData<NotificationsResponse>({
        queryKey: NOTIFICATIONS_KEY,
      });
      qc.setQueriesData<NotificationsResponse>(
        { queryKey: NOTIFICATIONS_KEY },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            items: old.items.map((n) =>
              n.id === id
                ? { ...n, status: 'unread' as const, readAt: null }
                : n,
            ),
          };
        },
      );
      return { previousData };
    },
    onError: (_err, _id, context) => {
      context?.previousData?.forEach(([key, data]) => {
        qc.setQueryData(key, data);
      });
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: NOTIFICATIONS_KEY });
    },
  });
}

export function useClearNotification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => notificationService.clearNotification(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: NOTIFICATIONS_KEY });
      const previousData = qc.getQueriesData<NotificationsResponse>({
        queryKey: NOTIFICATIONS_KEY,
      });
      qc.setQueriesData<NotificationsResponse>(
        { queryKey: NOTIFICATIONS_KEY },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            items: old.items.filter((n) => n.id !== id),
            counts: { ...old.counts, cleared: old.counts.cleared + 1 },
          };
        },
      );
      return { previousData };
    },
    onError: (_err, _id, context) => {
      context?.previousData?.forEach(([key, data]) => {
        qc.setQueryData(key, data);
      });
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: NOTIFICATIONS_KEY });
    },
  });
}

export function useUnclearNotification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => notificationService.unclearNotification(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: NOTIFICATIONS_KEY });
      const previousData = qc.getQueriesData<NotificationsResponse>({
        queryKey: NOTIFICATIONS_KEY,
      });
      qc.setQueriesData<NotificationsResponse>(
        { queryKey: NOTIFICATIONS_KEY },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            items: old.items.filter((n) => n.id !== id),
            counts: {
              ...old.counts,
              cleared: Math.max(0, old.counts.cleared - 1),
            },
          };
        },
      );
      return { previousData };
    },
    onError: (_err, _id, context) => {
      context?.previousData?.forEach(([key, data]) => {
        qc.setQueryData(key, data);
      });
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: NOTIFICATIONS_KEY });
    },
  });
}

export function useSnoozeNotification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: SnoozePayload }) =>
      notificationService.snoozeNotification(id, payload),
    onMutate: async ({ id, payload }) => {
      await qc.cancelQueries({ queryKey: NOTIFICATIONS_KEY });
      const previousData = qc.getQueriesData<NotificationsResponse>({
        queryKey: NOTIFICATIONS_KEY,
      });
      qc.setQueriesData<NotificationsResponse>(
        { queryKey: NOTIFICATIONS_KEY },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            items: old.items.filter((n) => n.id !== id),
            counts: {
              ...old.counts,
              later: old.counts.later + 1,
            },
          };
        },
      );
      return { previousData };
    },
    onError: (_err, _vars, context) => {
      context?.previousData?.forEach(([key, data]) => {
        qc.setQueryData(key, data);
      });
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: NOTIFICATIONS_KEY });
    },
  });
}

export function useUnsnoozeNotification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => notificationService.unsnoozeNotification(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: NOTIFICATIONS_KEY });
      const previousData = qc.getQueriesData<NotificationsResponse>({
        queryKey: NOTIFICATIONS_KEY,
      });
      qc.setQueriesData<NotificationsResponse>(
        { queryKey: NOTIFICATIONS_KEY },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            items: old.items.filter((n) => n.id !== id),
            counts: {
              ...old.counts,
              later: Math.max(0, old.counts.later - 1),
            },
          };
        },
      );
      return { previousData };
    },
    onError: (_err, _id, context) => {
      context?.previousData?.forEach(([key, data]) => {
        qc.setQueryData(key, data);
      });
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: NOTIFICATIONS_KEY });
    },
  });
}

export function useMarkAllRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: BulkActionPayload) =>
      notificationService.markAllRead(payload),
    onMutate: async ({ view }) => {
      await qc.cancelQueries({ queryKey: NOTIFICATIONS_KEY });
      const previousData = qc.getQueriesData<NotificationsResponse>({
        queryKey: NOTIFICATIONS_KEY,
      });
      qc.setQueriesData<NotificationsResponse>(
        { queryKey: NOTIFICATIONS_KEY },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            items: old.items.map((n) => ({
              ...n,
              status: 'read' as const,
              readAt: n.readAt ?? new Date().toISOString(),
            })),
          };
        },
      );
      return { previousData };
    },
    onError: (_err, _payload, context) => {
      context?.previousData?.forEach(([key, data]) => {
        qc.setQueryData(key, data);
      });
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: NOTIFICATIONS_KEY });
    },
  });
}

export function useClearAll() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: BulkActionPayload) =>
      notificationService.clearAll(payload),
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: NOTIFICATIONS_KEY });
      const previousData = qc.getQueriesData<NotificationsResponse>({
        queryKey: NOTIFICATIONS_KEY,
      });
      qc.setQueriesData<NotificationsResponse>(
        { queryKey: NOTIFICATIONS_KEY },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            items: [],
            counts: {
              ...old.counts,
              cleared: old.counts.cleared + old.items.length,
              all: 0,
              primary: 0,
              other: 0,
            },
          };
        },
      );
      return { previousData };
    },
    onError: (_err, _payload, context) => {
      context?.previousData?.forEach(([key, data]) => {
        qc.setQueryData(key, data);
      });
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: NOTIFICATIONS_KEY });
    },
  });
}

export function useDeleteAllCleared() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => notificationService.deleteAllCleared(),
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: NOTIFICATIONS_KEY });
      const previousData = qc.getQueriesData<NotificationsResponse>({
        queryKey: NOTIFICATIONS_KEY,
      });
      qc.setQueriesData<NotificationsResponse>(
        { queryKey: [...NOTIFICATIONS_KEY, 'cleared'] },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            items: [],
            counts: { ...old.counts, cleared: 0 },
          };
        },
      );
      return { previousData };
    },
    onError: (_err, _vars, context) => {
      context?.previousData?.forEach(([key, data]) => {
        qc.setQueryData(key, data);
      });
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: NOTIFICATIONS_KEY });
    },
  });
}
