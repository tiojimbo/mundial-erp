import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import {
  statusesService,
  type CreateStatusPayload,
  type UpdateStatusPayload,
} from '../services/statuses.service';

export const STATUSES_KEY = ['statuses'];

export function useStatusesByList(listId: string | null | undefined) {
  return useQuery({
    queryKey: [...STATUSES_KEY, 'list', listId],
    queryFn: () => statusesService.findByList(listId!),
    enabled: !!listId,
  });
}

export function useStatus(id: string | null | undefined) {
  return useQuery({
    queryKey: [...STATUSES_KEY, id],
    queryFn: () => statusesService.findById(id!),
    enabled: !!id,
  });
}

export function useCreateStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateStatusPayload) =>
      statusesService.create(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: STATUSES_KEY }),
  });
}

export function useUpdateStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: Omit<UpdateStatusPayload, 'id'>;
    }) => statusesService.update(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: STATUSES_KEY }),
  });
}

export function useDeleteStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => statusesService.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: STATUSES_KEY }),
  });
}

export function useStatusRequiredFields(statusId: string | null | undefined) {
  return useQuery({
    queryKey: [...STATUSES_KEY, statusId, 'required-fields'],
    queryFn: () => statusesService.getRequiredFields(statusId!),
    enabled: !!statusId,
  });
}

export function useSetStatusRequiredFields() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      statusId,
      customFieldIds,
    }: {
      statusId: string;
      customFieldIds: string[];
    }) => statusesService.setRequiredFields(statusId, customFieldIds),
    onSuccess: () => qc.invalidateQueries({ queryKey: STATUSES_KEY }),
  });
}
