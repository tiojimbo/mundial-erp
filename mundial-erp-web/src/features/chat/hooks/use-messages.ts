import {
  useInfiniteQuery,
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { messageService } from '../services/message.service';
import type {
  SendMessagePayload,
  UpdateMessagePayload,
} from '../types/chat.types';
import { CHANNELS_KEY } from './use-channels';

export const MESSAGES_KEY = ['chat-messages'];

export function useMessage(channelId: string, messageId: string) {
  return useQuery({
    queryKey: [...MESSAGES_KEY, channelId, messageId],
    queryFn: () => messageService.getById(channelId, messageId),
    enabled: !!channelId && !!messageId,
  });
}

export function useMessages(channelId: string) {
  return useInfiniteQuery({
    queryKey: [...MESSAGES_KEY, channelId],
    queryFn: ({ pageParam }) =>
      messageService.getByChannel(channelId, {
        cursor: pageParam as string,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.meta.cursor.hasMore ? lastPage.meta.cursor.next : undefined,
    enabled: !!channelId,
  });
}

export function useReplies(messageId: string) {
  return useInfiniteQuery({
    queryKey: [...MESSAGES_KEY, messageId, 'replies'],
    queryFn: ({ pageParam }) =>
      messageService.getReplies(messageId, {
        cursor: pageParam as string,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.meta.cursor.hasMore ? lastPage.meta.cursor.next : undefined,
    enabled: !!messageId,
  });
}

export function useSendMessage(channelId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: SendMessagePayload) =>
      messageService.send(channelId, payload),
    onSuccess: (_data, variables) => {
      // Invalidar mensagens do canal (atualiza replyCount no canal principal)
      qc.invalidateQueries({ queryKey: [...MESSAGES_KEY, channelId] });
      qc.invalidateQueries({ queryKey: CHANNELS_KEY });

      // Se e uma reply, invalidar a lista de replies da thread
      if (variables.parentMessageId) {
        qc.invalidateQueries({
          queryKey: [...MESSAGES_KEY, variables.parentMessageId, 'replies'],
        });
      }
    },
  });
}

export function useUpdateMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      messageId,
      payload,
    }: {
      messageId: string;
      payload: UpdateMessagePayload;
    }) => messageService.update(messageId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: MESSAGES_KEY });
    },
  });
}

export function useDeleteMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (messageId: string) => messageService.remove(messageId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: MESSAGES_KEY });
    },
  });
}
