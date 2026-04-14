import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { workItemsService } from '../services/work-items.service';
import type {
  WorkItemFilters,
  CreateWorkItemPayload,
  UpdateWorkItemPayload,
} from '../types/work-item.types';

export const WORK_ITEMS_KEY = ['work-items'];

export function useWorkItems(filters?: WorkItemFilters) {
  return useQuery({
    queryKey: [...WORK_ITEMS_KEY, filters],
    queryFn: () => workItemsService.list(filters),
    placeholderData: (prev) => prev,
  });
}

export function useWorkItemsGrouped(processId: string, groupBy?: string) {
  return useQuery({
    queryKey: [...WORK_ITEMS_KEY, 'grouped', processId, groupBy],
    queryFn: () => workItemsService.grouped(processId, groupBy),
    enabled: !!processId,
  });
}

export function useWorkItem(id: string) {
  return useQuery({
    queryKey: [...WORK_ITEMS_KEY, id],
    queryFn: () => workItemsService.getById(id),
    enabled: !!id,
  });
}

export function useCreateWorkItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateWorkItemPayload) =>
      workItemsService.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: WORK_ITEMS_KEY });
    },
  });
}

export function useUpdateWorkItem(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateWorkItemPayload) =>
      workItemsService.update(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: WORK_ITEMS_KEY });
    },
  });
}

export function useUpdateWorkItemStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, statusId }: { id: string; statusId: string }) =>
      workItemsService.updateStatus(id, statusId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: WORK_ITEMS_KEY });
    },
  });
}

export function useDeleteWorkItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => workItemsService.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: WORK_ITEMS_KEY });
    },
  });
}
