// Foundation (Sprint 0).
export { useTasks, TASKS_QUERY_KEY } from './use-tasks';
export { useInfiniteTasks } from './use-infinite-tasks';
export { useTask } from './use-task';
export {
  useCustomTaskTypes,
  CUSTOM_TASK_TYPES_QUERY_KEY,
} from './use-custom-task-types';

// Tasks mutations.
export { useCreateTask } from './use-create-task';
export { useUpdateTask } from './use-update-task';
export { useUpdateTaskStatus } from './use-update-task-status';
export { useDeleteTask } from './use-delete-task';
export { useArchiveTask } from './use-archive-task';
export { useUnarchiveTask } from './use-unarchive-task';
export { useMergeTasks } from './use-merge-tasks';

// Tags.
export { useTags } from './use-tags';
export { useCreateTag } from './use-create-tag';
export { useUpdateTag } from './use-update-tag';
export { useDeleteTag } from './use-delete-tag';
export { useAttachTag } from './use-attach-tag';
export { useDetachTag } from './use-detach-tag';

// Watchers.
export { useWatchers } from './use-watchers';
export { useAddWatcher } from './use-add-watcher';
export { useRemoveWatcher } from './use-remove-watcher';

// Dependencies.
export { useDependencies } from './use-dependencies';
export { useAddDependency } from './use-add-dependency';
export { useRemoveDependency } from './use-remove-dependency';

// Links.
export { useLinks } from './use-links';
export { useAddLink } from './use-add-link';
export { useRemoveLink } from './use-remove-link';

// Checklists.
export { useChecklists } from './use-checklists';
export { useCreateChecklist } from './use-create-checklist';
export { useUpdateChecklistItem } from './use-update-checklist-item';
export { useResolveChecklistItem } from './use-resolve-checklist-item';
export { useReorderChecklist } from './use-reorder-checklist';

// Attachments.
export { useAttachments } from './use-attachments';
export { useUploadAttachment } from './use-upload-attachment';

// Comments.
export { useComments } from './use-comments';
export { useCreateComment } from './use-create-comment';
export { useUpdateComment } from './use-update-comment';
export { useDeleteComment } from './use-delete-comment';

// Activities.
export { useActivities } from './use-activities';

// Templates (query-only singular).
export { useTemplates } from './use-templates';
export { useInstantiateTemplate } from './use-instantiate-template';

// Templates (CRUD completo — outro squad).
export {
  useTaskTemplates,
  useCreateTaskTemplate,
  useUpdateTaskTemplate,
  useDeleteTaskTemplate,
} from './use-task-templates';

// SSE.
export { useTaskSse } from './use-task-sse';
