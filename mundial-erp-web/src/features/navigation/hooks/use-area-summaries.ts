import { useQuery } from '@tanstack/react-query';
import { navigationService } from '../services/navigation.service';

export const AREA_SUMMARIES_KEY = (id: string, showClosed: boolean) => [
  'area-summaries',
  id,
  { showClosed },
];

export function useAreaSummaries(areaId: string, showClosed = false) {
  return useQuery({
    queryKey: AREA_SUMMARIES_KEY(areaId, showClosed),
    queryFn: () => navigationService.getAreaProcessSummaries(areaId, showClosed),
    enabled: !!areaId,
    placeholderData: (prev) => prev,
  });
}
