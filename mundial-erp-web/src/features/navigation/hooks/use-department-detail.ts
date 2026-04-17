import { useQuery } from '@tanstack/react-query';
import { navigationService } from '../services/navigation.service';

export const DEPARTMENT_DETAIL_KEY = (slug: string) => ['department-detail', slug];

export function useDepartmentDetail(slug: string) {
  return useQuery({
    queryKey: DEPARTMENT_DETAIL_KEY(slug),
    queryFn: () => navigationService.getDepartmentBySlug(slug),
    enabled: !!slug,
    placeholderData: (prev) => prev,
  });
}
