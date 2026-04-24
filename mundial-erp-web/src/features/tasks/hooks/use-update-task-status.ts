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
import type {
  GroupedWorkItemsResponse,
  WorkItem,
} from '@/features/work-items/types/work-item.types';
import { WORK_ITEMS_KEY } from '@/features/work-items/hooks/use-work-items';

import { tasksService } from '../services/tasks.service';
import { taskQueryKeys } from '../lib/query-keys';
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
  groupedSnapshots: Array<
    [readonly unknown[], GroupedWorkItemsResponse | undefined]
  >;
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

function moveTaskBetweenGroups(
  grouped: GroupedWorkItemsResponse,
  taskId: string,
  newStatus: TaskStatus,
): GroupedWorkItemsResponse | null {
  const sourceGroup = grouped.groups.find((g) =>
    g.items.some((i) => i.id === taskId),
  );
  if (!sourceGroup) return null;

  const taskInSource = sourceGroup.items.find((i) => i.id === taskId);
  if (!taskInSource) return null;

  const movedTask: WorkItem = {
    ...taskInSource,
    statusId: newStatus.id,
    status: {
      id: newStatus.id,
      name: newStatus.name,
      category: newStatus.category,
      color: newStatus.color,
      icon: newStatus.icon ?? null,
    },
  };

  const groups = grouped.groups.map((g) => {
    if (g.statusId === sourceGroup.statusId) {
      return {
        ...g,
        count: Math.max(0, g.count - 1),
        items: g.items.filter((i) => i.id !== taskId),
      };
    }
    if (g.statusId === newStatus.id) {
      return {
        ...g,
        count: g.count + 1,
        items: [...g.items, movedTask],
      };
    }
    return g;
  });

  return { ...grouped, groups };
}

/**
 * Hook para atualizar status de uma task/work-item.
 *
 * - Se `scopedTaskId` for informado, o hook fica "preso" àquela task (modo
 *   legado, usado pelo popover da list view).
 * - Se não for informado, o `taskId` deve vir nas variáveis da mutation
 *   (modo usado pelo board, que precisa mutar tasks arbitrárias).
 */
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
        return { detailSnapshots: [], listSnapshots: [], groupedSnapshots: [] };
      }

      await qc.cancelQueries({ queryKey: taskQueryKeys.all(workspaceId) });
      await qc.cancelQueries({ queryKey: WORK_ITEMS_KEY });

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

      const groupedSnapshots = qc.getQueriesData<GroupedWorkItemsResponse>({
        queryKey: [...WORK_ITEMS_KEY, 'grouped'],
      });
      groupedSnapshots.forEach(([key, data]) => {
        if (!data) return;
        const moved = moveTaskBetweenGroups(data, id, status);
        if (moved) qc.setQueryData<GroupedWorkItemsResponse>(key, moved);
      });

      return { detailSnapshots, listSnapshots, groupedSnapshots };
    },

    onError: (_err, _vars, ctx) => {
      if (!ctx) return;
      ctx.detailSnapshots.forEach(([key, data]) => qc.setQueryData(key, data));
      ctx.listSnapshots.forEach(([key, data]) => qc.setQueryData(key, data));
      ctx.groupedSnapshots.forEach(([key, data]) => qc.setQueryData(key, data));
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
      qc.invalidateQueries({ queryKey: WORK_ITEMS_KEY });
    },
  });
}
