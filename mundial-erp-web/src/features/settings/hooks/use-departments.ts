import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { departmentsService } from '../services/departments.service';
import type {
  CreateDepartmentPayload,
  UpdateDepartmentPayload,
  CreateAreaPayload,
  UpdateAreaPayload,
} from '../types/settings.types';

export const DEPARTMENTS_KEY = ['departments'];

export function useDepartments() {
  return useQuery({
    queryKey: DEPARTMENTS_KEY,
    queryFn: () => departmentsService.getAll(),
  });
}

export function useDepartment(id: string) {
  return useQuery({
    queryKey: [...DEPARTMENTS_KEY, id],
    queryFn: () => departmentsService.getById(id),
    enabled: !!id,
  });
}

export function useCreateDepartment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateDepartmentPayload) => departmentsService.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DEPARTMENTS_KEY });
    },
  });
}

export function useUpdateDepartment(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateDepartmentPayload) => departmentsService.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DEPARTMENTS_KEY });
    },
  });
}

export function useDeleteDepartment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => departmentsService.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DEPARTMENTS_KEY });
    },
  });
}

export function useCreateArea() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateAreaPayload) => departmentsService.createArea(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DEPARTMENTS_KEY });
    },
  });
}

export function useUpdateArea(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateAreaPayload) => departmentsService.updateArea(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DEPARTMENTS_KEY });
    },
  });
}

export function useDeleteArea() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => departmentsService.removeArea(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DEPARTMENTS_KEY });
    },
  });
}
