import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { syncService } from '../services/sync.service';
import type { SyncLogFilters } from '../types/sync.types';

export const SYNC_KEY = ['sync'];

export function useSyncStatus() {
  return useQuery({
    queryKey: [...SYNC_KEY, 'status'],
    queryFn: () => syncService.getStatus(),
    refetchInterval: 10000,
  });
}

export function useSyncLogs(filters?: SyncLogFilters) {
  return useQuery({
    queryKey: [...SYNC_KEY, 'logs', filters],
    queryFn: () => syncService.getLogs(filters),
    placeholderData: (prev) => prev,
  });
}

export function useSyncJob(jobId: string | null) {
  return useQuery({
    queryKey: [...SYNC_KEY, 'jobs', jobId],
    queryFn: () => syncService.getJob(jobId!),
    enabled: !!jobId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status === 'PENDING' || status === 'IN_PROGRESS') return 3000;
      return false;
    },
  });
}

export function useSyncClients() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => syncService.syncClients(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SYNC_KEY });
    },
  });
}

export function useSyncOrders() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => syncService.syncOrders(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SYNC_KEY });
    },
  });
}

export function useSyncReferenceData() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => syncService.syncReferenceData(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SYNC_KEY });
    },
  });
}

export function useSyncAll() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => syncService.syncAll(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SYNC_KEY });
    },
  });
}
