import {
  useMutation,
  useQueryClient,
  type InfiniteData,
} from '@tanstack/react-query';
import { toast } from 'sonner';

import type {
  CursorPaginatedResponse,
  PaginatedResponse,
} from '@/types/api.types';
import { tasksService } from '../services/tasks.service';
import { taskQueryKeys } from '../lib/query-keys';
import { TASKS_GROUPED_KEY } from './use-tasks-grouped';
import { useWorkspaceId } from '../lib/use-workspace-id';
import type { Task, TaskStatus } from '../types/task.types';

type TasksPage = PaginatedResponse<Task> | CursorPaginatedResponse<Task>;
type TasksInfinite = InfiniteData<TasksPage>;

type UpdateTaskStatusVars = {
  statusId: string;
  status: TaskStatus;
  taskId?: string;
};

type Context = {
  detailSnapshots: Array<[readonly unknown[], Task | undefined]>;
  listSnapshots: Array<[readonly unknown[], TasksInfinite | undefined]>;
};

function patchTaskInPage(
  page: TasksPage,
  taskId: string,
  patch: Partial<Task>,
): TasksPage {
  return {
    ...page,
    data: page.data.map((t) => (t.id === taskId ? { ...t, ...patch } : t)),
  };
}

export function useUpdateTaskStatus(scopedTaskId?: string) {
  const qc = useQueryClient();
  const workspaceId = useWorkspaceId();

  return useMutation<Task, Error, UpdateTaskStatusVars, Context>({
    mutationKey: [
      workspaceId,
      'tasks',
      'update-status',
      scopedTaskId ?? 'dynamic',
    ],
    mutationFn: ({ statusId, taskId }) => {
      const id = scopedTaskId ?? taskId;
      if (!id) throw new Error('taskId é obrigatório');
      return tasksService.update(id, { statusId });
    },

    onMutate: async ({ statusId, status, taskId }) => {
      const id = scopedTaskId ?? taskId;
      if (!id) {
        return { detailSnapshots: [], listSnapshots: [] };
      }

      await qc.cancelQueries({ queryKey: taskQueryKeys.all(workspaceId) });
      await qc.cancelQueries({ queryKey: TASKS_GROUPED_KEY });

      const patch: Partial<Task> = { statusId, status };

      const detailSnapshots = qc.getQueriesData<Task>({
        queryKey: taskQueryKeys.details(workspaceId),
      });
      detailSnapshots.forEach(([key, data]) => {
        if (!data || data.id !== id) return;
        qc.setQueryData<Task>(key, { ...data, ...patch });
      });

      const listSnapshots = qc.getQueriesData<TasksInfinite>({
        queryKey: taskQueryKeys.lists(workspaceId),
      });
      listSnapshots.forEach(([key, data]) => {
        if (!data) return;
        qc.setQueryData<TasksInfinite>(key, {
          ...data,
          pages: data.pages.map((p) => patchTaskInPage(p, id, patch)),
        });
      });

      return { detailSnapshots, listSnapshots };
    },

    onError: (_err, _vars, ctx) => {
      if (!ctx) return;
      ctx.detailSnapshots.forEach(([key, data]) => qc.setQueryData(key, data));
      ctx.listSnapshots.forEach(([key, data]) => qc.setQueryData(key, data));
      toast.error('Erro ao atualizar status da tarefa');
    },

    onSuccess: (serverTask, { taskId }) => {
      const id = scopedTaskId ?? taskId;
      if (!id) return;
      qc.getQueriesData<Task>({
        queryKey: taskQueryKeys.details(workspaceId),
      }).forEach(([key, data]) => {
        if (!data || data.id !== id) return;
        qc.setQueryData<Task>(key, { ...data, ...serverTask });
      });

      qc.getQueriesData<TasksInfinite>({
        queryKey: taskQueryKeys.lists(workspaceId),
      }).forEach(([key, data]) => {
        if (!data) return;
        qc.setQueryData<TasksInfinite>(key, {
          ...data,
          pages: data.pages.map((p) => patchTaskInPage(p, id, serverTask)),
        });
      });
    },

    onSettled: () => {
      qc.invalidateQueries({ queryKey: taskQueryKeys.all(workspaceId) });
      qc.invalidateQueries({ queryKey: TASKS_GROUPED_KEY });
    },
  });
}
