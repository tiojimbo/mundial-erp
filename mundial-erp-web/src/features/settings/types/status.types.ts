import type { TaskStatus } from '@/features/tasks/types/task.types';

export type StatusType = 'NOT_STARTED' | 'ACTIVE' | 'DONE' | 'CLOSED';

export const STATUS_TYPE_ORDER: StatusType[] = [
  'NOT_STARTED',
  'ACTIVE',
  'DONE',
  'CLOSED',
];

export const STATUS_TYPE_LABELS: Record<StatusType, string> = {
  NOT_STARTED: 'Not Started',
  ACTIVE: 'Active',
  DONE: 'Done',
  CLOSED: 'Closed',
};

export type Status = TaskStatus & {
  position: number;
  spaceId: string | null;
  folderId: string | null;
  listId: string | null;
};
