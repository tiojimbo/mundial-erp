export interface TaskEventContext {
  workspaceId: string;
  taskId: string;
  listId: string;
  folderId?: string | null;
  spaceId?: string | null;
  actorUserId: string | null;
  automationDepth?: number;
}

export interface TaskCreatedPayload extends TaskEventContext {
  parentTaskId: string | null;
  customTaskTypeId: string | null;
}

export interface TaskUpdatedPayload extends TaskEventContext {
  changedFields: string[];
}

export interface TaskFieldChangedPayload<T = unknown> extends TaskEventContext {
  before: T | null;
  after: T | null;
}

export interface TaskAssignmentPayload extends TaskEventContext {
  userId: string;
}

export interface TaskMovedToListPayload extends TaskEventContext {
  fromListId: string;
  toListId: string;
}

export interface TaskTagPayload extends TaskEventContext {
  tagId: string;
}

export interface TaskCommentPayload extends TaskEventContext {
  commentId: string;
  authorId: string;
}

export interface SubtaskCreatedPayload extends TaskEventContext {
  parentTaskId: string;
  subtaskId: string;
}

export interface AllSubtasksResolvedPayload extends TaskEventContext {
  parentTaskId: string;
}

export interface CustomFieldChangedPayload extends TaskEventContext {
  customFieldDefinitionId: string;
  before: unknown;
  after: unknown;
}

export interface CronEventPayload {
  workspaceId: string;
  automationId: string;
  scheduledFor: Date;
}
