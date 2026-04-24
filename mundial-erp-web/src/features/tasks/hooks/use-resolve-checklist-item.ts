import { useUpdateChecklistItem } from './use-update-checklist-item';

type Vars = {
  taskId: string;
  checklistId: string;
  itemId: string;
  completed: boolean;
};

/**
 * Acucar para o toggle resolver/desresolver — compartilha optimistic
 * e rollback com `useUpdateChecklistItem`.
 */
export function useResolveChecklistItem() {
  const mutation = useUpdateChecklistItem();
  return {
    ...mutation,
    mutate: (vars: Vars) =>
      mutation.mutate({
        taskId: vars.taskId,
        checklistId: vars.checklistId,
        itemId: vars.itemId,
        payload: { completed: vars.completed },
      }),
    mutateAsync: (vars: Vars) =>
      mutation.mutateAsync({
        taskId: vars.taskId,
        checklistId: vars.checklistId,
        itemId: vars.itemId,
        payload: { completed: vars.completed },
      }),
  };
}
