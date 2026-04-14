import { useMutation, useQueryClient } from '@tanstack/react-query';
import { reactionService } from '../services/reaction.service';
import { MESSAGES_KEY } from './use-messages';

export function useAddReaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      messageId,
      emojiName,
    }: {
      messageId: string;
      emojiName: string;
    }) => reactionService.add(messageId, emojiName),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: MESSAGES_KEY });
    },
  });
}

export function useRemoveReaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      messageId,
      emojiName,
    }: {
      messageId: string;
      emojiName: string;
    }) => reactionService.remove(messageId, emojiName),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: MESSAGES_KEY });
    },
  });
}
