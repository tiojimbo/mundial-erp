import { useQuery } from '@tanstack/react-query';
import { processViewsService } from '../services/process-views.service';
import type { ProcessView } from '../types/process-view.types';

export const processViewsKeys = {
  list: (processId: string) => ['process-views', processId] as const,
};

export function useProcessViews(processId: string | undefined) {
  return useQuery<ProcessView[]>({
    queryKey: processViewsKeys.list(processId ?? ''),
    queryFn: () => processViewsService.list(processId as string),
    enabled: Boolean(processId),
    staleTime: 30_000,
  });
}
