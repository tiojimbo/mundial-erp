import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  tasksService,
  type BulkUpdateTaskItem,
} from '../services/tasks.service';
import { taskQueryKeys } from '../lib/query-keys';
import { useWorkspaceId } from '../lib/use-workspace-id';
import { TASKS_GROUPED_KEY } from './use-tasks-grouped';
import type { Task } from '../types/task.types';

export function useBulkUpdateTasks() {
  const qc = useQueryClient();
  const workspaceId = useWorkspaceId();

  return useMutation<Task[], Error, BulkUpdateTaskItem[]>({
    mutationFn: (tasks) => tasksService.bulkUpdate(tasks),
    onMutate: async (tasks) => {
      await qc.cancelQueries({ queryKey: TASKS_GROUPED_KEY });
      const snapshots = qc.getQueriesData({ queryKey: TASKS_GROUPED_KEY });
      const patches = new Map(tasks.map((t) => [t.id, t]));
      snapshots.forEach(([key, data]) => {
        if (!Array.isArray(data)) return;
        const next = data.map((entry) => ({
          ...entry,
          tasks: (entry as { tasks: Task[] }).tasks.map((task) => {
            const p = patches.get(task.id);
            if (!p) return task;
            return {
              ...task,
              statusId: p.statusId ?? task.statusId,
              priority: p.priority ?? task.priority,
              primaryAssigneeId:
                p.primaryAssigneeId !== undefined
                  ? p.primaryAssigneeId
                  : task.primaryAssigneeId,
              dueDate: p.dueDate !== undefined ? p.dueDate : task.dueDate,
              startDate:
                p.startDate !== undefined ? p.startDate : task.startDate,
              archived: p.archived ?? task.archived,
            };
          }),
        }));
        qc.setQueryData(key, next);
      });
      return { snapshots };
    },
    onError: (_err, _vars, ctx) => {
      const snapshots = (ctx as { snapshots?: Array<[readonly unknown[], unknown]> })?.snapshots;
      snapshots?.forEach(([key, data]) => qc.setQueryData(key, data));
      toast.error('Erro ao atualizar tarefas em massa');
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: TASKS_GROUPED_KEY });
      qc.invalidateQueries({ queryKey: taskQueryKeys.all(workspaceId) });
    },
  });
}

export function useBulkDeleteTasks() {
  const qc = useQueryClient();
  const workspaceId = useWorkspaceId();

  return useMutation<{ count: number }, Error, string[]>({
    mutationFn: (taskIds) => tasksService.bulkDelete(taskIds),
    onMutate: async (taskIds) => {
      await qc.cancelQueries({ queryKey: TASKS_GROUPED_KEY });
      const snapshots = qc.getQueriesData({ queryKey: TASKS_GROUPED_KEY });
      const idSet = new Set(taskIds);
      snapshots.forEach(([key, data]) => {
        if (!Array.isArray(data)) return;
        const next = data.map((entry) => ({
          ...entry,
          tasks: (entry as { tasks: Task[] }).tasks.filter(
            (task) => !idSet.has(task.id),
          ),
        }));
        qc.setQueryData(key, next);
      });
      return { snapshots };
    },
    onError: (_err, _vars, ctx) => {
      const snapshots = (ctx as { snapshots?: Array<[readonly unknown[], unknown]> })?.snapshots;
      snapshots?.forEach(([key, data]) => qc.setQueryData(key, data));
      toast.error('Erro ao excluir tarefas');
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: TASKS_GROUPED_KEY });
      qc.invalidateQueries({ queryKey: taskQueryKeys.all(workspaceId) });
    },
  });
}
