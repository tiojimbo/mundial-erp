import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { taskChecklistsService } from '../services/task-checklists.service';
import { taskQueryKeys } from '../lib/query-keys';
import { useWorkspaceId } from '../lib/use-workspace-id';
import type {
  ReorderChecklistDto,
  TaskChecklist,
} from '../types/task.types';

type Vars = {
  taskId: string;
  checklistId: string;
  payload: ReorderChecklistDto;
};

type Context = { previousChecklists: TaskChecklist[] | undefined };

export function useReorderChecklist() {
  const qc = useQueryClient();
  const workspaceId = useWorkspaceId();

  return useMutation<void, Error, Vars, Context>({
    mutationKey: [workspaceId, 'tasks', 'checklists', 'reorder'],
    mutationFn: ({ checklistId, payload }) =>
      taskChecklistsService.reorder(checklistId, payload),

    onMutate: async ({ taskId, checklistId, payload }) => {
      const key = taskQueryKeys.checklists(workspaceId, taskId);
      await qc.cancelQueries({ queryKey: key });
      const previousChecklists = qc.getQueryData<TaskChecklist[]>(key);
      if (previousChecklists) {
        const positions = new Map(
          payload.map((entry) => [entry.id, entry.position]),
        );
        qc.setQueryData<TaskChecklist[]>(
          key,
          previousChecklists.map((checklist) => {
            if (checklist.id !== checklistId) return checklist;
            const reordered = [...checklist.items]
              .map((item) =>
                positions.has(item.id)
                  ? { ...item, position: positions.get(item.id) as number }
                  : item,
              )
              .sort((a, b) => a.position - b.position);
            return { ...checklist, items: reordered };
          }),
        );
      }
      return { previousChecklists };
    },

    onError: (err, { taskId }, ctx) => {
      if (ctx?.previousChecklists) {
        qc.setQueryData(
          taskQueryKeys.checklists(workspaceId, taskId),
          ctx.previousChecklists,
        );
      }
      toast.error(err.message || 'Erro ao reordenar checklist');
    },

    onSettled: (_d, _e, { taskId }) => {
      qc.invalidateQueries({
        queryKey: taskQueryKeys.checklists(workspaceId, taskId),
      });
    },
  });
}
