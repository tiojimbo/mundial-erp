// Barrel da Task View (Sprint 5 — TSK-150).
// Ordem segue PLANO-TASKS.md §10.5 e tasks.md §4-§5.
// Todos named exports — regra #13. Unica excecao: ../app/(dashboard)/tasks/[taskId]/page.tsx.

// Container + descricao
export { TaskView } from './task-view';
export type { TaskViewProps } from './task-view';
export { TaskDescription } from './task-description';
export type { TaskDescriptionProps } from './task-description';

// Main blocks (§4.1-§4.4)
export { TaskTypeRow } from './task-type-row';
export type { TaskTypeRowProps } from './task-type-row';
export { TaskTitle } from './task-title';
export type { TaskTitleProps } from './task-title';
export { PropertyRow } from './property-row';
export type { PropertyRowProps } from './property-row';
export { TaskPropertyGrid } from './task-property-grid';
export type { TaskPropertyGridProps } from './task-property-grid';
export { StatusBadge } from './status-badge';
export type { StatusBadgeProps } from './status-badge';
export { PriorityPicker } from './priority-picker';
export type { PriorityPickerProps } from './priority-picker';
export { AssigneeMultiPicker } from './assignee-multi-picker';
export type { AssigneeMultiPickerProps } from './assignee-multi-picker';
export { DateRangePicker } from './date-range-picker';
export type { DateRangePickerProps } from './date-range-picker';
export { TimeEstimateInput } from './time-estimate-input';
export type { TimeEstimateInputProps } from './time-estimate-input';
export { TagPicker } from './tag-picker';
export type { TagPickerProps } from './tag-picker';

// Shared section primitives
export { CollapsibleSection } from './collapsible-section';
export type { CollapsibleSectionProps } from './collapsible-section';
export { EmptyCardCta } from './empty-card-cta';
export type { EmptyCardCtaProps } from './empty-card-cta';
export { ProgressBar } from './progress-bar';
export type { ProgressBarProps } from './progress-bar';

// Sections (§4.7-§4.12)
export { CustomFieldsSection } from './custom-fields-section';
export type { CustomFieldsSectionProps } from './custom-fields-section';
export { LinkedTasksSection } from './linked-tasks-section';
export type { LinkedTasksSectionProps } from './linked-tasks-section';
export { TimeTrackingSection } from './time-tracking-section';
export type { TimeTrackingSectionProps } from './time-tracking-section';
export { SubtasksSection } from './subtasks-section';
export type { SubtasksSectionProps } from './subtasks-section';
export { SubtaskRow } from './subtask-row';
export type { SubtaskRowProps } from './subtask-row';
export { ChecklistsSection } from './checklists-section';
export type { ChecklistsSectionProps } from './checklists-section';
export { ChecklistPanel } from './checklist-panel';
export type { ChecklistPanelProps } from './checklist-panel';
export { AttachmentsSection } from './attachments-section';
export type { AttachmentsSectionProps } from './attachments-section';
export { AttachmentsGrid } from './attachments-grid';
export type { AttachmentsGridProps } from './attachments-grid';

// Activities panel (§5)
export { ActivitiesPanel } from './activities-panel/activities-panel';
export type { ActivitiesPanelProps } from './activities-panel/activities-panel';
export { ActivitiesHeader } from './activities-panel/activities-header';
export type { ActivitiesHeaderProps } from './activities-panel/activities-header';
export { ActivityFeed } from './activities-panel/activity-feed';
export type { ActivityFeedProps } from './activities-panel/activity-feed';
export { ActivityItem } from './activities-panel/activity-item';
export type { ActivityItemProps } from './activities-panel/activity-item';
export { CommentComposer } from './activities-panel/comment-composer';
export type { CommentComposerProps } from './activities-panel/comment-composer';

// Shared dialog
export { ConfirmDialog } from './confirm-dialog';
export type { ConfirmDialogProps } from './confirm-dialog';
