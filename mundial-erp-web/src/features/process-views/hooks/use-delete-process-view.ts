import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { processViewsService } from '../services/process-views.service';
import { processViewsKeys } from './use-process-views';

export function useDeleteProcessView(processId: string | undefined) {
  const qc = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (id) => processViewsService.delete(id),
    onSuccess: () => {
      if (processId) {
        qc.invalidateQueries({ queryKey: processViewsKeys.list(processId) });
      }
      toast.success('Visualização excluída.');
    },
    onError: (err) => {
      toast.error(err.message || 'Erro ao excluir visualização.');
    },
  });
}
