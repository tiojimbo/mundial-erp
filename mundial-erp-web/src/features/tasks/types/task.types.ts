import type { z } from 'zod';
import type {
  taskFiltersSchema,
  taskSummarySchema,
  taskDetailSchema,
  taskStatusSchema,
  taskAssigneeSchema,
  taskTagSchema,
  taskPrioritySchema,
  taskOrderBySchema,
  taskDirectionSchema,
  taskItemTypeSchema,
  taskIncludeSchema,
  customTaskTypeSchema,
  createTaskSchema,
  updateTaskSchema,
  mergeTasksSchema,
  taskChecklistSchema,
  taskChecklistItemSchema,
  taskDependencySchema,
  taskDependenciesBundleSchema,
  taskLinkSchema,
  taskWatcherSchema,
  taskAttachmentSchema,
  taskCommentSchema,
  taskActivitySchema,
  taskTemplateSchema,
  taskTimeInStatusSchema,
  taskPaginationSchema,
  createTagSchema,
  updateTagSchema,
  createChecklistSchema,
  updateChecklistSchema,
  createChecklistItemSchema,
  updateChecklistItemSchema,
  reorderChecklistSchema,
  createDependencySchema,
  attachmentSignedUrlRequestSchema,
  attachmentSignedUrlResponseSchema,
  attachmentUploadSchema,
  commentCreateSchema,
  commentUpdateSchema,
  createTemplateSchema,
  updateTemplateSchema,
} from '../schemas/task.schema';

/**
 * Tipos derivados dos schemas Zod — fonte unica da verdade.
 * TODO Sprint 2: substituir por tipos gerados pelo backend
 * quando o OpenAPI/Swagger for exportado.
 */
export type TaskFilters = z.infer<typeof taskFiltersSchema>;
export type TaskSummary = z.infer<typeof taskSummarySchema>;
export type TaskDetail = z.infer<typeof taskDetailSchema>;
export type TaskStatus = z.infer<typeof taskStatusSchema>;
export type TaskAssignee = z.infer<typeof taskAssigneeSchema>;
export type TaskTag = z.infer<typeof taskTagSchema>;
export type TaskPriority = z.infer<typeof taskPrioritySchema>;
export type TaskOrderBy = z.infer<typeof taskOrderBySchema>;
export type TaskDirection = z.infer<typeof taskDirectionSchema>;
export type TaskItemType = z.infer<typeof taskItemTypeSchema>;
export type TaskInclude = z.infer<typeof taskIncludeSchema>;
export type CustomTaskType = z.infer<typeof customTaskTypeSchema>;
export type CreateTaskDto = z.infer<typeof createTaskSchema>;
export type UpdateTaskDto = z.infer<typeof updateTaskSchema>;
export type MergeTasksDto = z.infer<typeof mergeTasksSchema>;
export type TaskChecklist = z.infer<typeof taskChecklistSchema>;
export type TaskChecklistItem = z.infer<typeof taskChecklistItemSchema>;
export type TaskDependency = z.infer<typeof taskDependencySchema>;
export type TaskDependenciesBundle = z.infer<
  typeof taskDependenciesBundleSchema
>;
export type TaskLink = z.infer<typeof taskLinkSchema>;
export type TaskWatcher = z.infer<typeof taskWatcherSchema>;
export type TaskAttachment = z.infer<typeof taskAttachmentSchema>;
export type TaskComment = z.infer<typeof taskCommentSchema>;
export type TaskActivity = z.infer<typeof taskActivitySchema>;
export type TaskTemplate = z.infer<typeof taskTemplateSchema>;
export type TaskTimeInStatus = z.infer<typeof taskTimeInStatusSchema>;
export type TaskPagination = z.infer<typeof taskPaginationSchema>;
export type CreateTagDto = z.infer<typeof createTagSchema>;
export type UpdateTagDto = z.infer<typeof updateTagSchema>;
export type CreateChecklistDto = z.infer<typeof createChecklistSchema>;
export type UpdateChecklistDto = z.infer<typeof updateChecklistSchema>;
export type CreateChecklistItemDto = z.infer<typeof createChecklistItemSchema>;
export type UpdateChecklistItemDto = z.infer<typeof updateChecklistItemSchema>;
export type ReorderChecklistDto = z.infer<typeof reorderChecklistSchema>;
export type CreateDependencyDto = z.infer<typeof createDependencySchema>;
export type AttachmentSignedUrlRequest = z.infer<
  typeof attachmentSignedUrlRequestSchema
>;
export type AttachmentSignedUrlResponse = z.infer<
  typeof attachmentSignedUrlResponseSchema
>;
export type AttachmentUploadDto = z.infer<typeof attachmentUploadSchema>;
export type CommentCreateDto = z.infer<typeof commentCreateSchema>;
export type CommentUpdateDto = z.infer<typeof commentUpdateSchema>;
export type CreateTemplateDto = z.infer<typeof createTemplateSchema>;
export type UpdateTemplateDto = z.infer<typeof updateTemplateSchema>;

/**
 * Compat Sprint 0 — componentes migrados em lote ainda usam estes nomes.
 */
export type Task = TaskSummary;
export type CreateTaskPayload = CreateTaskDto & { processId: string };
export type UpdateTaskPayload = UpdateTaskDto;

/**
 * Envelope de listagem (pagina offset OU cursor).
 */
export type TasksListResult = {
  data: TaskSummary[];
  meta: TaskPagination;
};

/**
 * Envelope paginado simples (comments, activities).
 */
export type PaginatedResult<T> = {
  data: T[];
  meta: TaskPagination;
};

/**
 * UI state — colapso de secoes da Task View (§10.5).
 * As keys devem bater com os ids das CollapsibleSection.
 */
export type CollapsibleSectionKey =
  | 'custom-fields'
  | 'linked-tasks'
  | 'time-tracking'
  | 'subtasks'
  | 'checklists'
  | 'attachments';
