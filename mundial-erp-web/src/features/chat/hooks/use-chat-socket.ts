'use client';

import { useEffect, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getSocket, connectSocket, disconnectSocket } from '@/lib/socket';
import { useChatStore } from '@/stores/chat.store';
import { MESSAGES_KEY } from './use-messages';
import { CHANNELS_KEY } from './use-channels';
import type { Message } from '../types/chat.types';

let socketInitialized = false;

export function useChatSocket() {
  const qcRef = useRef(useQueryClient());

  useEffect(() => {
    if (socketInitialized) return;
    socketInitialized = true;

    connectSocket();
    const socket = getSocket();

    socket.on('message:new', (message: Message) => {
      qcRef.current.invalidateQueries({
        queryKey: [...MESSAGES_KEY, message.channelId],
      });
      qcRef.current.invalidateQueries({ queryKey: CHANNELS_KEY });

      const { activeChannelId, incrementUnread } = useChatStore.getState();
      if (activeChannelId !== message.channelId) {
        incrementUnread(message.channelId);
      }
    });

    socket.on('message:updated', (message: Message) => {
      qcRef.current.invalidateQueries({
        queryKey: [...MESSAGES_KEY, message.channelId],
      });
    });

    socket.on(
      'message:deleted',
      (payload: { messageId: string; channelId: string }) => {
        qcRef.current.invalidateQueries({
          queryKey: [...MESSAGES_KEY, payload.channelId],
        });
      },
    );

    socket.on('reaction:added', (payload: { channelId: string }) => {
      qcRef.current.invalidateQueries({
        queryKey: [...MESSAGES_KEY, payload.channelId],
      });
    });

    socket.on('reaction:removed', (payload: { channelId: string }) => {
      qcRef.current.invalidateQueries({
        queryKey: [...MESSAGES_KEY, payload.channelId],
      });
    });

    socket.on(
      'typing:start',
      (payload: { channelId: string; userId: string }) => {
        const { setTyping, clearTyping } = useChatStore.getState();
        setTyping(payload.channelId, payload.userId);
        setTimeout(() => {
          clearTyping(payload.channelId, payload.userId);
        }, 3000);
      },
    );

    socket.on('user:online', (payload: { userId: string }) => {
      useChatStore.getState().setUserOnline(payload.userId);
    });

    socket.on('user:offline', (payload: { userId: string }) => {
      useChatStore.getState().setUserOffline(payload.userId);
    });

    socket.on('member:added', (payload: { channelId: string }) => {
      qcRef.current.invalidateQueries({
        queryKey: [...CHANNELS_KEY, payload.channelId, 'members'],
      });
    });

    socket.on('member:removed', (payload: { channelId: string }) => {
      qcRef.current.invalidateQueries({
        queryKey: [...CHANNELS_KEY, payload.channelId, 'members'],
      });
    });

    return () => {
      socketInitialized = false;
      disconnectSocket();
    };
  }, []);

  const sendTyping = useCallback((channelId: string) => {
    const socket = getSocket();
    socket.emit('message:typing', { channelId });
  }, []);

  return { sendTyping };
}
