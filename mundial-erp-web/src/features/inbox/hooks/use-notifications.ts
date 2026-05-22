import {
  useQuery,
  useInfiniteQuery,
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

export function useNotifications(view: InboxView, page = 1, limit = 20) {
  return useQuery({
    queryKey: [...NOTIFICATIONS_KEY, view, page, limit],
    queryFn: () => notificationService.getNotifications({ view, page, limit }),
    refetchOnWindowFocus: true,
    staleTime: 30_000,
  });
}

export function useInfiniteNotifications(view: InboxView, limit = 20) {
  return useInfiniteQuery({
    queryKey: [...NOTIFICATIONS_KEY, 'infinite', view, limit],
    queryFn: ({ pageParam = 1 }) =>
      notificationService.getNotifications({ view, page: pageParam, limit }),
    getNextPageParam: (last) =>
      last.meta.hasNextPage ? last.meta.page + 1 : undefined,
    initialPageParam: 1,
    staleTime: 30_000,
  });
}

function patchListQueries(
  qc: ReturnType<typeof useQueryClient>,
  updater: (old: NotificationsResponse) => NotificationsResponse,
) {
  qc.setQueriesData<NotificationsResponse>(
    { queryKey: NOTIFICATIONS_KEY },
    (old) => (old ? updater(old) : old),
  );
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
      patchListQueries(qc, (old) => ({
        ...old,
        notifications: old.notifications.map((n) =>
          n.id === id
            ? { ...n, status: 'read', readAt: new Date().toISOString() }
            : n,
        ),
      }));
      return { previousData };
    },
    onError: (_err, _id, context) => {
      context?.previousData?.forEach(([key, data]) =>
        qc.setQueryData(key, data),
      );
    },
    onSettled: () => qc.invalidateQueries({ queryKey: NOTIFICATIONS_KEY }),
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
      patchListQueries(qc, (old) => ({
        ...old,
        notifications: old.notifications.map((n) =>
          n.id === id ? { ...n, status: 'unread', readAt: null } : n,
        ),
      }));
      return { previousData };
    },
    onError: (_err, _id, context) => {
      context?.previousData?.forEach(([key, data]) =>
        qc.setQueryData(key, data),
      );
    },
    onSettled: () => qc.invalidateQueries({ queryKey: NOTIFICATIONS_KEY }),
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
      patchListQueries(qc, (old) => ({
        ...old,
        notifications: old.notifications.filter((n) => n.id !== id),
        counts: { ...old.counts, cleared: old.counts.cleared + 1 },
      }));
      return { previousData };
    },
    onError: (_err, _id, context) => {
      context?.previousData?.forEach(([key, data]) =>
        qc.setQueryData(key, data),
      );
    },
    onSettled: () => qc.invalidateQueries({ queryKey: NOTIFICATIONS_KEY }),
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
      patchListQueries(qc, (old) => ({
        ...old,
        notifications: old.notifications.filter((n) => n.id !== id),
        counts: {
          ...old.counts,
          cleared: Math.max(0, old.counts.cleared - 1),
        },
      }));
      return { previousData };
    },
    onError: (_err, _id, context) => {
      context?.previousData?.forEach(([key, data]) =>
        qc.setQueryData(key, data),
      );
    },
    onSettled: () => qc.invalidateQueries({ queryKey: NOTIFICATIONS_KEY }),
  });
}

export function useSnoozeNotification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: SnoozePayload }) =>
      notificationService.snoozeNotification(id, payload),
    onMutate: async ({ id }) => {
      await qc.cancelQueries({ queryKey: NOTIFICATIONS_KEY });
      const previousData = qc.getQueriesData<NotificationsResponse>({
        queryKey: NOTIFICATIONS_KEY,
      });
      patchListQueries(qc, (old) => ({
        ...old,
        notifications: old.notifications.filter((n) => n.id !== id),
        counts: { ...old.counts, later: old.counts.later + 1 },
      }));
      return { previousData };
    },
    onError: (_err, _vars, context) => {
      context?.previousData?.forEach(([key, data]) =>
        qc.setQueryData(key, data),
      );
    },
    onSettled: () => qc.invalidateQueries({ queryKey: NOTIFICATIONS_KEY }),
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
      patchListQueries(qc, (old) => ({
        ...old,
        notifications: old.notifications.filter((n) => n.id !== id),
        counts: {
          ...old.counts,
          later: Math.max(0, old.counts.later - 1),
        },
      }));
      return { previousData };
    },
    onError: (_err, _id, context) => {
      context?.previousData?.forEach(([key, data]) =>
        qc.setQueryData(key, data),
      );
    },
    onSettled: () => qc.invalidateQueries({ queryKey: NOTIFICATIONS_KEY }),
  });
}

export function useDeleteNotification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => notificationService.deleteNotification(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: NOTIFICATIONS_KEY }),
  });
}

export function useMarkAllRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: BulkActionPayload) =>
      notificationService.markAllRead(payload),
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: NOTIFICATIONS_KEY });
      const previousData = qc.getQueriesData<NotificationsResponse>({
        queryKey: NOTIFICATIONS_KEY,
      });
      patchListQueries(qc, (old) => ({
        ...old,
        notifications: old.notifications.map((n) => ({
          ...n,
          status: 'read',
          readAt: n.readAt ?? new Date().toISOString(),
        })),
      }));
      return { previousData };
    },
    onError: (_err, _payload, context) => {
      context?.previousData?.forEach(([key, data]) =>
        qc.setQueryData(key, data),
      );
    },
    onSettled: () => qc.invalidateQueries({ queryKey: NOTIFICATIONS_KEY }),
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
      patchListQueries(qc, (old) => ({
        ...old,
        notifications: [],
        counts: {
          ...old.counts,
          cleared: old.counts.cleared + old.notifications.length,
          all: 0,
          primary: 0,
          other: 0,
        },
      }));
      return { previousData };
    },
    onError: (_err, _payload, context) => {
      context?.previousData?.forEach(([key, data]) =>
        qc.setQueryData(key, data),
      );
    },
    onSettled: () => qc.invalidateQueries({ queryKey: NOTIFICATIONS_KEY }),
  });
}

export function useDeleteAllCleared() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => notificationService.deleteAllCleared(),
    onSuccess: () => qc.invalidateQueries({ queryKey: NOTIFICATIONS_KEY }),
  });
}
