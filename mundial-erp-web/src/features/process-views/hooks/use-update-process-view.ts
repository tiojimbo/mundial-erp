import { useMutation, useQueryClient } from '@tanstack/react-query';
import { processViewsService } from '../services/process-views.service';
import { processViewsKeys } from './use-process-views';
import type { UpdateProcessViewPayload } from '../types/process-view.types';

export function useUpdateProcessView(processId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: UpdateProcessViewPayload;
    }) => processViewsService.update(id, payload),
    onSuccess: () => {
      if (processId) {
        qc.invalidateQueries({ queryKey: processViewsKeys.list(processId) });
      }
    },
  });
}
