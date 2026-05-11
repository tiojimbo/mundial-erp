import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { io, type Socket } from 'socket.io-client';
import { toast } from 'sonner';
import { NOTIFICATIONS_KEY } from './use-notifications';
import type { Notification } from '../types/notification.types';

function resolveSocketBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  return raw.replace(/\/api\/v1\/?$/, '').replace(/\/$/, '');
}

export function useNotificationsSocket(): void {
  const qc = useQueryClient();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const token = localStorage.getItem('access_token');
    if (!token) return;

    const socket: Socket = io(`${resolveSocketBaseUrl()}/notifications`, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socket.on('notification', (notification: Notification) => {
      qc.invalidateQueries({ queryKey: NOTIFICATIONS_KEY });
      toast.info(notification.title || 'Nova notificação', {
        description: notification.description ?? undefined,
      });
    });

    return () => {
      socket.disconnect();
    };
  }, [qc]);
}
