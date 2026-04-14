import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { processesService } from '../services/processes.service';
import type {
  CreateProcessPayload,
  UpdateProcessPayload,
  CreateActivityPayload,
  UpdateActivityPayload,
} from '../types/settings.types';

export const PROCESSES_KEY = ['processes'];

export function useProcesses() {
  return useQuery({
    queryKey: PROCESSES_KEY,
    queryFn: () => processesService.getAll(),
  });
}

export function useProcess(id: string) {
  return useQuery({
    queryKey: [...PROCESSES_KEY, id],
    queryFn: () => processesService.getById(id),
    enabled: !!id,
  });
}

export function useCreateProcess() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateProcessPayload) => processesService.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROCESSES_KEY });
    },
  });
}

export function useUpdateProcess(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateProcessPayload) => processesService.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROCESSES_KEY });
    },
  });
}

export function useDeleteProcess() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => processesService.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROCESSES_KEY });
    },
  });
}

export function useCreateActivity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateActivityPayload) => processesService.createActivity(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROCESSES_KEY });
    },
  });
}

export function useUpdateActivity(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateActivityPayload) => processesService.updateActivity(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROCESSES_KEY });
    },
  });
}

export function useDeleteActivity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => processesService.removeActivity(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROCESSES_KEY });
    },
  });
}
