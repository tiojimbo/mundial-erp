import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { taskCommentsService } from '../services/task-comments.service';
import { taskQueryKeys } from '../lib/query-keys';
import { useWorkspaceId } from '../lib/use-workspace-id';
import { useAuthStore } from '@/stores/auth.store';
import type { CommentReaction, TaskComment } from '../types/task.types';

type Vars = { taskId: string; commentId: string; emoji: string };

type CommentsPage = { items?: TaskComment[]; total?: number } & Record<
  string,
  unknown
>;

function applyToggle(
  page: CommentsPage | undefined,
  commentId: string,
  emoji: string,
  userId: string,
): CommentsPage | undefined {
  if (!page || !Array.isArray(page.items)) return page;
  return {
    ...page,
    items: page.items.map((c) => {
      if (c.id !== commentId) return c;
      const existing = c.reactions ?? [];
      const has = existing.some(
        (r) => r.emoji === emoji && r.userId === userId,
      );
      const next: CommentReaction[] = has
        ? existing.filter((r) => !(r.emoji === emoji && r.userId === userId))
        : [
            ...existing,
            { emoji, userId, createdAt: new Date().toISOString() },
          ];
      return { ...c, reactions: next };
    }),
  };
}

export function useToggleReaction() {
  const qc = useQueryClient();
  const workspaceId = useWorkspaceId();
  const userId = useAuthStore((s) => s.user?.id ?? '');

  return useMutation({
    mutationKey: [workspaceId, 'tasks', 'comments', 'reactions', 'toggle'],
    mutationFn: ({ commentId, emoji }: Vars) =>
      taskCommentsService.toggleReaction(commentId, emoji),
    onMutate: async ({ taskId, commentId, emoji }) => {
      if (!userId) return { previous: [] as Array<[readonly unknown[], unknown]> };
      const key = taskQueryKeys.comments(workspaceId, taskId);
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueriesData<CommentsPage>({ queryKey: key });
      qc.setQueriesData<CommentsPage>({ queryKey: key }, (old) =>
        applyToggle(old, commentId, emoji, userId),
      );
      return { previous };
    },
    onError: (err, _vars, context) => {
      context?.previous?.forEach(([key, data]) => {
        qc.setQueryData(key, data);
      });
      toast.error(
        err instanceof Error ? err.message : 'Erro ao reagir ao comentario',
      );
    },
    onSettled: (_data, _err, { taskId }) => {
      qc.invalidateQueries({
        queryKey: taskQueryKeys.comments(workspaceId, taskId),
      });
    },
  });
}
