import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  statusTemplatesService,
  type CreateStatusTemplatePayload,
} from '../services/status-templates.service';

export const STATUS_TEMPLATES_KEY = ['status-templates'];

export function useStatusTemplates() {
  return useQuery({
    queryKey: STATUS_TEMPLATES_KEY,
    queryFn: () => statusTemplatesService.findAll(),
  });
}

export function useCreateStatusTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateStatusTemplatePayload) =>
      statusTemplatesService.create(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: STATUS_TEMPLATES_KEY }),
  });
}

export function useDeleteStatusTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => statusTemplatesService.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: STATUS_TEMPLATES_KEY }),
  });
}
