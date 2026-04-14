import {
  useQuery,
  useMutation,
  useQueryClient,
  useInfiniteQuery,
} from '@tanstack/react-query';
import { channelService } from '../services/channel.service';
import type {
  ChannelFilters,
  CreateChannelPayload,
  CreateDmPayload,
  UpdateChannelPayload,
  AddMembersPayload,
} from '../types/chat.types';

export const CHANNELS_KEY = ['chat-channels'];

export function useChannels(filters?: ChannelFilters) {
  return useInfiniteQuery({
    queryKey: [...CHANNELS_KEY, filters],
    queryFn: ({ pageParam }) =>
      channelService.getAll({ ...filters, cursor: pageParam as string }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.meta.cursor.hasMore ? lastPage.meta.cursor.next : undefined,
  });
}

export function useChannel(id: string) {
  return useQuery({
    queryKey: [...CHANNELS_KEY, id],
    queryFn: () => channelService.getById(id),
    enabled: !!id,
  });
}

export function useChannelMembers(channelId: string) {
  return useInfiniteQuery({
    queryKey: [...CHANNELS_KEY, channelId, 'members'],
    queryFn: ({ pageParam }) =>
      channelService.getMembers(channelId, {
        cursor: pageParam as string,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.meta.cursor.hasMore ? lastPage.meta.cursor.next : undefined,
    enabled: !!channelId,
  });
}

export function useCreateChannel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateChannelPayload) =>
      channelService.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CHANNELS_KEY });
    },
  });
}

export function useCreateDm() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateDmPayload) =>
      channelService.createDm(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CHANNELS_KEY });
    },
  });
}

export function useUpdateChannel(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateChannelPayload) =>
      channelService.update(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CHANNELS_KEY });
    },
  });
}

export function useDeleteChannel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => channelService.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CHANNELS_KEY });
    },
  });
}

export function useAddMembers(channelId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: AddMembersPayload) =>
      channelService.addMembers(channelId, payload),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: [...CHANNELS_KEY, channelId, 'members'],
      });
    },
  });
}

export function useMarkAsRead(channelId: string) {
  return useMutation({
    mutationFn: () => channelService.markAsRead(channelId),
  });
}
