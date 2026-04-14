import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { homeService } from '../services/home.service';

export const PENDING_HANDOFFS_KEY = ['pending-handoffs'];

export function usePendingHandoffs() {
  return useQuery({
    queryKey: PENDING_HANDOFFS_KEY,
    queryFn: () => homeService.getPendingHandoffs(),
    refetchInterval: 60 * 1000,
  });
}

export function useAcceptHandoff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => homeService.acceptHandoff(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: PENDING_HANDOFFS_KEY });
    },
  });
}

export function useRejectHandoff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => homeService.rejectHandoff(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: PENDING_HANDOFFS_KEY });
    },
  });
}
