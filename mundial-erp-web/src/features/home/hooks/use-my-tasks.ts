import { useQuery } from '@tanstack/react-query';
import { myTasksService } from '../services/my-tasks.service';

export function useMyTasks() {
  return useQuery({
    queryKey: ['my-tasks'],
    queryFn: () => myTasksService.getMyTasks(),
    staleTime: 1000 * 60,
  });
}
