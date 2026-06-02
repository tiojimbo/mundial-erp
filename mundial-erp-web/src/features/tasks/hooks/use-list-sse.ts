import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ListSSEClient, type TaskSseEvent } from '../lib/sse-client';
import { TASKS_GROUPED_KEY } from './use-tasks-grouped';
import { useWorkspaceId } from '../lib/use-workspace-id';

type Options = {
  enabled?: boolean;
  onEvent?: (event: TaskSseEvent) => void;
};

export function useListSse(listId: string, options: Options = {}) {
  const { enabled = true, onEvent } = options;
  const qc = useQueryClient();
  const workspaceId = useWorkspaceId();
  const clientRef = useRef<ListSSEClient | null>(null);

  useEffect(() => {
    if (!enabled || !listId || !workspaceId) return;

    const token =
      typeof window !== 'undefined'
        ? (localStorage.getItem('access_token') ?? undefined)
        : undefined;

    const client = new ListSSEClient({
      listId,
      token,
      onEvent: (event) => {
        onEvent?.(event);
        if (event.type === 'status.changed') {
          qc.invalidateQueries({
            queryKey: [...TASKS_GROUPED_KEY, 'list', listId],
          });
        }
      },
    });
    clientRef.current = client;
    client.connect();

    return () => {
      client.close();
      clientRef.current = null;
    };
  }, [listId, enabled, workspaceId, qc, onEvent]);
}
