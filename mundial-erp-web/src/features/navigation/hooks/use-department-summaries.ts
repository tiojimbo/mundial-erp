import { useQuery } from '@tanstack/react-query';
import { navigationService } from '../services/navigation.service';

export const DEPARTMENT_SUMMARIES_KEY = (id: string, showClosed: boolean) => [
  'department-summaries',
  id,
  { showClosed },
];

export function useDepartmentSummaries(departmentId: string, showClosed = false) {
  return useQuery({
    queryKey: DEPARTMENT_SUMMARIES_KEY(departmentId, showClosed),
    queryFn: () =>
      navigationService.getDepartmentProcessSummaries(departmentId, showClosed),
    enabled: !!departmentId,
    placeholderData: (prev) => prev,
  });
}
