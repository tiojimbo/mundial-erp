import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { processViewsService } from '../services/process-views.service';
import { processViewsKeys } from './use-process-views';
import type {
  CreateProcessViewPayload,
  ProcessView,
} from '../types/process-view.types';

export function useCreateProcessView() {
  const qc = useQueryClient();
  return useMutation<ProcessView, Error, CreateProcessViewPayload>({
    mutationFn: (payload) => processViewsService.create(payload),
    onSuccess: (view) => {
      qc.invalidateQueries({
        queryKey: processViewsKeys.list(view.processId),
      });
      toast.success('Visualização criada.');
    },
    onError: (err) => {
      toast.error(err.message || 'Erro ao criar visualização.');
    },
  });
}
