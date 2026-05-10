export const AUTOMATION_EVENTS = {
  TASK_CREATED: 'automation.task.created',
  TASK_UPDATED: 'automation.task.updated',
  TASK_STATUS_CHANGED: 'automation.task.status_changed',
  TASK_PRIORITY_CHANGED: 'automation.task.priority_changed',
  TASK_NAME_CHANGED: 'automation.task.name_changed',
  TASK_TYPE_CHANGED: 'automation.task.type_changed',
  TASK_DUE_DATE_CHANGED: 'automation.task.due_date_changed',
  TASK_START_DATE_CHANGED: 'automation.task.start_date_changed',
  TASK_ASSIGNED: 'automation.task.assigned',
  TASK_MOVED_TO_LIST: 'automation.task.moved_to_list',
  ASSIGNEE_REMOVED: 'automation.task.assignee_removed',
  TAG_ADDED: 'automation.task.tag_added',
  TAG_REMOVED: 'automation.task.tag_removed',
  COMMENT_CREATED: 'automation.task.comment_created',
  SUBTASK_CREATED: 'automation.task.subtask_created',
  ALL_SUBTASKS_RESOLVED: 'automation.task.all_subtasks_resolved',
  CUSTOMFIELD_CHANGED: 'automation.task.customfield_changed',
  CRON: 'automation.cron',
} as const;

export type AutomationEventName =
  (typeof AUTOMATION_EVENTS)[keyof typeof AUTOMATION_EVENTS];
