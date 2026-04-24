import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { taskTemplatesService } from '../services/task-templates.service';
import { taskQueryKeys, TASKS_STALE_TIME_MS } from '../lib/query-keys';
import { useWorkspaceId } from '../lib/use-workspace-id';
import type {
  CreateTemplateDto,
  TaskTemplate,
  UpdateTemplateDto,
} from '../types/task.types';

/**
 * Templates de Task — PLANO-TASKS.md §7.3 / rota `/settings/task-templates`.
 */
export function useTaskTemplates() {
  const workspaceId = useWorkspaceId();
  return useQuery({
    queryKey: taskQueryKeys.templates(workspaceId),
    queryFn: () => taskTemplatesService.list(),
    staleTime: TASKS_STALE_TIME_MS,
    enabled: Boolean(workspaceId),
  });
}

export function useCreateTaskTemplate() {
  const qc = useQueryClient();
  const workspaceId = useWorkspaceId();
  return useMutation<TaskTemplate, Error, CreateTemplateDto>({
    mutationKey: [workspaceId, 'tasks', 'templates', 'create'],
    mutationFn: (payload) => taskTemplatesService.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: taskQueryKeys.templates(workspaceId) });
    },
    onError: (err) => {
      toast.error(err.message || 'Erro ao criar template');
    },
  });
}

type UpdateVars = { templateId: string; payload: UpdateTemplateDto };

export function useUpdateTaskTemplate() {
  const qc = useQueryClient();
  const workspaceId = useWorkspaceId();
  return useMutation<TaskTemplate, Error, UpdateVars>({
    mutationKey: [workspaceId, 'tasks', 'templates', 'update'],
    mutationFn: ({ templateId, payload }) =>
      taskTemplatesService.update(templateId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: taskQueryKeys.templates(workspaceId) });
    },
    onError: (err) => {
      toast.error(err.message || 'Erro ao atualizar template');
    },
  });
}

export function useDeleteTaskTemplate() {
  const qc = useQueryClient();
  const workspaceId = useWorkspaceId();
  return useMutation<void, Error, string>({
    mutationKey: [workspaceId, 'tasks', 'templates', 'delete'],
    mutationFn: (templateId) => taskTemplatesService.remove(templateId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: taskQueryKeys.templates(workspaceId) });
    },
    onError: (err) => {
      toast.error(err.message || 'Erro ao excluir template');
    },
  });
}
