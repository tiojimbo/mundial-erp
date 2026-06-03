import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { io, type Socket } from 'socket.io-client';
import { TASKS_GROUPED_KEY } from './use-tasks-grouped';

function resolveSocketBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  return raw.replace(/\/api\/v1\/?$/, '').replace(/\/$/, '');
}

type TaskUpdatedPayload = { taskId: string; listId?: string };

export function useTasksRealtime(listId: string): void {
  const qc = useQueryClient();

  useEffect(() => {
    if (typeof window === 'undefined' || !listId) return;

    const token = localStorage.getItem('access_token');
    if (!token) return;

    const socket: Socket = io(`${resolveSocketBaseUrl()}/notifications`, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socket.on('task:updated', (payload: TaskUpdatedPayload) => {
      if (payload.listId && payload.listId !== listId) return;
      qc.invalidateQueries({
        queryKey: [...TASKS_GROUPED_KEY, 'list', listId],
      });
    });

    return () => {
      socket.disconnect();
    };
  }, [qc, listId]);
}
