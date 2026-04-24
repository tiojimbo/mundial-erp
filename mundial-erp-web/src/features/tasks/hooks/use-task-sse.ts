import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  TaskSSEClient,
  type TaskSseEvent,
} from '../lib/sse-client';
import { taskQueryKeys } from '../lib/query-keys';
import { useWorkspaceId } from '../lib/use-workspace-id';

type Options = {
  enabled?: boolean;
  /** Callback extra para o consumer (ex: abrir toast em `comment.created`). */
  onEvent?: (event: TaskSseEvent) => void;
};

/**
 * Hook SSE para uma Task — TSK-803.
 *
 * Conecta/desconecta automaticamente por `taskId`. Invalidacoes React Query
 * sao decididas por tipo de evento:
 *   - `activity.created`         → activities
 *   - `task.updated`             → detail + activities
 *   - `task.deleted`             → detail (remove) + lists
 *   - `comment.created`          → comments + activities
 *   - `attachment.scan_completed`→ attachments + activities
 *
 * O cap de 3 conexoes simultaneas esta dentro do `TaskSSEClient`.
 */
export function useTaskSse(taskId: string, options: Options = {}) {
  const { enabled = true, onEvent } = options;
  const qc = useQueryClient();
  const workspaceId = useWorkspaceId();
  const clientRef = useRef<TaskSSEClient | null>(null);

  useEffect(() => {
    if (!enabled || !taskId || !workspaceId) return;

    const token =
      typeof window !== 'undefined'
        ? localStorage.getItem('access_token') ?? undefined
        : undefined;

    const client = new TaskSSEClient({
      taskId,
      token,
      onEvent: (event) => {
        onEvent?.(event);
        switch (event.type) {
          case 'activity.created': {
            qc.invalidateQueries({
              queryKey: taskQueryKeys.activities(workspaceId, taskId),
            });
            break;
          }
          case 'task.updated': {
            qc.invalidateQueries({
              queryKey: taskQueryKeys.detail(workspaceId, taskId),
            });
            qc.invalidateQueries({
              queryKey: taskQueryKeys.activities(workspaceId, taskId),
            });
            break;
          }
          case 'task.deleted': {
            qc.removeQueries({
              queryKey: taskQueryKeys.detail(workspaceId, taskId),
            });
            qc.invalidateQueries({
              queryKey: taskQueryKeys.lists(workspaceId),
            });
            break;
          }
          case 'comment.created': {
            qc.invalidateQueries({
              queryKey: [
                workspaceId,
                'tasks',
                taskId,
                'comments',
              ] as readonly unknown[],
            });
            qc.invalidateQueries({
              queryKey: taskQueryKeys.activities(workspaceId, taskId),
            });
            break;
          }
          case 'attachment.scan_completed': {
            qc.invalidateQueries({
              queryKey: taskQueryKeys.attachments(workspaceId, taskId),
            });
            qc.invalidateQueries({
              queryKey: taskQueryKeys.activities(workspaceId, taskId),
            });
            break;
          }
          default:
            break;
        }
      },
    });
    clientRef.current = client;
    client.connect();

    return () => {
      client.close();
      clientRef.current = null;
    };
  }, [taskId, enabled, workspaceId, qc, onEvent]);
}
