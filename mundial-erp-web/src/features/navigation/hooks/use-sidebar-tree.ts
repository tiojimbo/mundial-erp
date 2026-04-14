import { useQuery } from '@tanstack/react-query';
import { navigationService } from '../services/navigation.service';

export const SIDEBAR_TREE_KEY = ['sidebar-tree'];

export function useSidebarTree() {
  return useQuery({
    queryKey: SIDEBAR_TREE_KEY,
    queryFn: () => navigationService.getSidebarTree(),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}
