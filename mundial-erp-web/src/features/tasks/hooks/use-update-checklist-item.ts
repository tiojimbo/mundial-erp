import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { taskChecklistsService } from '../services/task-checklists.service';
import { taskQueryKeys } from '../lib/query-keys';
import { useWorkspaceId } from '../lib/use-workspace-id';
import type {
  TaskChecklist,
  TaskChecklistItem,
  UpdateChecklistItemDto,
} from '../types/task.types';

type Vars = {
  taskId: string;
  checklistId: string;
  itemId: string;
  payload: UpdateChecklistItemDto;
};

type Context = {
  previousChecklists: TaskChecklist[] | undefined;
};

function patchItem(
  items: TaskChecklistItem[],
  itemId: string,
  payload: UpdateChecklistItemDto,
): TaskChecklistItem[] {
  return items.map((item) => {
    if (item.id === itemId) {
      const merged: TaskChecklistItem = { ...item };
      if (payload.text !== undefined) merged.text = payload.text;
      if (payload.completed !== undefined) merged.completed = payload.completed;
      if (payload.parentId !== undefined) merged.parentId = payload.parentId;
      if (payload.position !== undefined) merged.position = payload.position;
      return merged;
    }
    const children = Array.isArray(item.children)
      ? (item.children as TaskChecklistItem[])
      : [];
    if (children.length > 0) {
      return {
        ...item,
        children: patchItem(children, itemId, payload),
      };
    }
    return item;
  });
}

export function useUpdateChecklistItem() {
  const qc = useQueryClient();
  const workspaceId = useWorkspaceId();

  return useMutation<TaskChecklistItem, Error, Vars, Context>({
    mutationKey: [workspaceId, 'tasks', 'checklists', 'updateItem'],
    mutationFn: ({ checklistId, itemId, payload }) =>
      taskChecklistsService.updateItem(checklistId, itemId, payload),

    onMutate: async ({ taskId, checklistId, itemId, payload }) => {
      const key = taskQueryKeys.checklists(workspaceId, taskId);
      await qc.cancelQueries({ queryKey: key });
      const previousChecklists = qc.getQueryData<TaskChecklist[]>(key);
      if (previousChecklists) {
        qc.setQueryData<TaskChecklist[]>(
          key,
          previousChecklists.map((checklist) =>
            checklist.id === checklistId
              ? {
                  ...checklist,
                  items: patchItem(checklist.items, itemId, payload),
                }
              : checklist,
          ),
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
      toast.error(err.message || 'Erro ao atualizar item');
    },

    onSettled: (_d, _e, { taskId }) => {
      qc.invalidateQueries({
        queryKey: taskQueryKeys.checklists(workspaceId, taskId),
      });
    },
  });
}
