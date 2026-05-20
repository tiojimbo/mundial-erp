'use client';

import * as Dropdown from '@/components/ui/dropdown';
import { useWorkspaceStore } from '@/stores/workspace.store';
import { useWorkspaceTaskTypes } from '../../hooks/use-workspace-task-types';
import { useUpdateTask } from '../../hooks/use-update-task';
import { getIconByName } from '../icon-picker';
import type { TaskDetail } from '../../types/task.types';

export type TaskTypeRowProps = {
  task: Pick<TaskDetail, 'id' | 'customType' | 'customTypeId' | 'itemType'>;
};

export function TaskTypeRow({ task }: TaskTypeRowProps) {
  const workspaceId = useWorkspaceStore((s) => s.currentWorkspace?.id);
  const typesQuery = useWorkspaceTaskTypes(workspaceId);
  const updateTask = useUpdateTask();
  const types = typesQuery.data ?? [];

  const label =
    task.customType?.value ??
    (task.itemType === 'MILESTONE' ? 'Marco' : 'Task');
  const TriggerIcon = getIconByName(task.customType?.icon);
  const currentId = task.customTypeId ?? null;

  function apply(nextId: string | null) {
    if (nextId === currentId) return;
    updateTask.mutate({ taskId: task.id, payload: { customTypeId: nextId } });
  }

  return (
    <header className="flex items-center gap-2">
      <Dropdown.Root>
        <Dropdown.Trigger asChild>
          <button
            type="button"
            aria-label="Alterar tipo da tarefa"
            className="flex items-center gap-1.5 rounded-lg border border-border/60 bg-muted/40 px-2 text-sm transition-all duration-150 hover:border-border hover:bg-muted active:scale-[0.97]"
            style={{ height: '1.5rem' }}
          >
            <TriggerIcon className="h-3.5 w-3.5" />
            <span>{label}</span>
          </button>
        </Dropdown.Trigger>
        <Dropdown.Content
          align="start"
          className="max-h-72 w-56 overflow-y-auto"
        >
          <Dropdown.Item onSelect={() => apply(null)}>
            Nenhum (sem tipo)
          </Dropdown.Item>
          {types.map((t) => {
            const ItemIcon = getIconByName(t.icon);
            return (
              <Dropdown.Item key={t.id} onSelect={() => apply(t.id)}>
                <Dropdown.ItemIcon as={ItemIcon} />
                {t.value}
              </Dropdown.Item>
            );
          })}
        </Dropdown.Content>
      </Dropdown.Root>
    </header>
  );
}
