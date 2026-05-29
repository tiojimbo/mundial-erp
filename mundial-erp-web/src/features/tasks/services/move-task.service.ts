import { api } from '@/lib/api';
import type { TaskStatus } from '../types/task.types';

export type CustomFieldMoveAction = 'KEEP' | 'CLEAR';

export interface StatusDiff {
  sourceStatusId: string;
  sourceName: string;
  sourceType: TaskStatus['type'];
  autoTargetStatusId: string | null;
  autoTargetName: string | null;
  taskCount: number;
}

export interface CustomFieldDiffItem {
  customFieldId: string;
  customFieldName: string;
  taskCount: number;
}

export interface MovePreview {
  needsReconciliation: boolean;
  statusDiffs: StatusDiff[];
  customFieldDiffs: {
    onlyInSource: CustomFieldDiffItem[];
    onlyInTarget: CustomFieldDiffItem[];
    inBoth: CustomFieldDiffItem[];
  };
}

export interface MoveToListPayload {
  targetListId: string;
  taskIds: string[];
  statusMapping: { sourceStatusId: string; targetStatusId: string }[];
  customFieldActions?: {
    customFieldId: string;
    action: CustomFieldMoveAction;
  }[];
}

// As rotas de move usam @SkipResponseTransform no backend (sem envelope
// {data,meta}); desembrulha defensivamente caso isso mude.
function unwrap<T>(body: unknown): T {
  if (
    body !== null &&
    typeof body === 'object' &&
    'data' in body &&
    'meta' in body
  ) {
    return (body as { data: T }).data;
  }
  return body as T;
}

export const moveTaskService = {
  async movePreview(
    taskIds: string[],
    targetListId: string,
  ): Promise<MovePreview> {
    const res = await api.get<unknown>('/tasks/move-preview', {
      params: { taskIds: taskIds.join(','), targetListId },
    });
    return unwrap<MovePreview>(res.data);
  },

  async moveToList(payload: MoveToListPayload): Promise<{ moved: number }> {
    const res = await api.put<unknown>('/tasks/move-to-list', payload);
    return unwrap<{ moved: number }>(res.data);
  },
};
