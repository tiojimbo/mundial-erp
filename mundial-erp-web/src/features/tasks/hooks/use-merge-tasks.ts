import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { tasksService } from '../services/tasks.service';
import { taskQueryKeys } from '../lib/query-keys';
import { useWorkspaceId } from '../lib/use-workspace-id';
import { generateIdempotencyKey } from '../utils/idempotency-key';
import type { Task } from '../types/task.types';

type MergeVars = {
  targetTaskId: string;
  sourceTaskIds: string[];
  /** Opcional — se nao fornecido, um UUID v4 e gerado. */
  idempotencyKey?: string;
};

/**
 * Merge de tasks — PLANO §8.4.
 *
 * Sempre envia `Idempotency-Key` para protecao contra double-submit
 * (backend respeita via Redis SETNX TTL 24h).
 */
export function useMergeTasks() {
  const qc = useQueryClient();
  const workspaceId = useWorkspaceId();

  return useMutation<Task, Error, MergeVars>({
    mutationKey: [workspaceId, 'tasks', 'merge'],
    mutationFn: ({ targetTaskId, sourceTaskIds, idempotencyKey }) =>
      tasksService.merge(
        targetTaskId,
        sourceTaskIds,
        idempotencyKey ?? generateIdempotencyKey(),
      ),
    onSuccess: (_data, { targetTaskId, sourceTaskIds }) => {
      qc.invalidateQueries({
        queryKey: taskQueryKeys.detail(workspaceId, targetTaskId),
      });
      for (const id of sourceTaskIds) {
        qc.invalidateQueries({
          queryKey: taskQueryKeys.detail(workspaceId, id),
        });
      }
      qc.invalidateQueries({ queryKey: taskQueryKeys.lists(workspaceId) });
      toast.success('Tarefas mescladas.');
    },
    onError: (err) => {
      toast.error(err.message || 'Erro ao mesclar tarefas');
    },
  });
}
