import { useQuery } from '@tanstack/react-query';
import { navigationService } from '../services/navigation.service';

export const AREA_DETAIL_KEY = (slug: string) => ['area-detail', slug];

export function useAreaDetail(slug: string) {
  return useQuery({
    queryKey: AREA_DETAIL_KEY(slug),
    queryFn: () => navigationService.getAreaBySlug(slug),
    enabled: !!slug,
    placeholderData: (prev) => prev,
  });
}
