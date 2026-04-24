/**
 * Storybook stories — ActivityItem por TaskActivityType.
 *
 * Variantes: uma story por TaskActivityType (PLANO-TASKS §4.5 + §8.5).
 * Tipos canonicos: STATUS_CHANGED, ASSIGNEE_ADDED, ASSIGNEE_REMOVED,
 * COMMENT_ADDED, ATTACHMENT_ADDED, TAG_ADDED, TAG_REMOVED, WATCHER_ADDED,
 * CHECKLIST_RESOLVED, DUE_DATE_CHANGED, PRIORITY_CHANGED, MERGED.
 */

import type { Meta, StoryObj } from '@storybook/react';

type TaskActivityType =
  | 'STATUS_CHANGED'
  | 'ASSIGNEE_ADDED'
  | 'ASSIGNEE_REMOVED'
  | 'COMMENT_ADDED'
  | 'ATTACHMENT_ADDED'
  | 'TAG_ADDED'
  | 'TAG_REMOVED'
  | 'WATCHER_ADDED'
  | 'CHECKLIST_RESOLVED'
  | 'DUE_DATE_CHANGED'
  | 'PRIORITY_CHANGED'
  | 'MERGED';

interface ActivityItemProps {
  type: TaskActivityType;
  actorName: string;
  occurredAt: string;
  payload?: Record<string, string>;
}

const ActivityItem = (props: ActivityItemProps): JSX.Element => (
  <div data-type={props.type}>
    <strong>{props.actorName}</strong> {props.type} <em>{props.occurredAt}</em>
    {props.payload && <pre>{JSON.stringify(props.payload)}</pre>}
  </div>
);

const meta: Meta<typeof ActivityItem> = {
  title: 'Tasks/TaskView/ActivityItem',
  component: ActivityItem,
};

export default meta;

type Story = StoryObj<typeof ActivityItem>;

export const StatusChanged: Story = {
  args: {
    type: 'STATUS_CHANGED',
    actorName: 'Ana',
    occurredAt: '2 min atras',
    payload: { from: 'A fazer', to: 'Em andamento' },
  },
};

export const AssigneeAdded: Story = {
  args: {
    type: 'ASSIGNEE_ADDED',
    actorName: 'Joao',
    occurredAt: '10 min atras',
    payload: { assignee: 'Maria' },
  },
};

export const AssigneeRemoved: Story = {
  args: {
    type: 'ASSIGNEE_REMOVED',
    actorName: 'Joao',
    occurredAt: '1h atras',
    payload: { assignee: 'Carlos' },
  },
};

export const CommentAdded: Story = {
  args: {
    type: 'COMMENT_ADDED',
    actorName: 'Ana',
    occurredAt: '15 min atras',
    payload: { preview: 'Revisar a parte 2...' },
  },
};

export const AttachmentAdded: Story = {
  args: {
    type: 'ATTACHMENT_ADDED',
    actorName: 'Pedro',
    occurredAt: '30 min atras',
    payload: { filename: 'report.pdf' },
  },
};

export const TagAdded: Story = {
  args: {
    type: 'TAG_ADDED',
    actorName: 'Maria',
    occurredAt: '5 min atras',
    payload: { tag: 'frontend' },
  },
};

export const TagRemoved: Story = {
  args: {
    type: 'TAG_REMOVED',
    actorName: 'Maria',
    occurredAt: '3 min atras',
    payload: { tag: 'bug' },
  },
};

export const WatcherAdded: Story = {
  args: {
    type: 'WATCHER_ADDED',
    actorName: 'Lucia',
    occurredAt: '1 min atras',
    payload: { watcher: 'Carlos' },
  },
};

export const ChecklistResolved: Story = {
  args: {
    type: 'CHECKLIST_RESOLVED',
    actorName: 'Ana',
    occurredAt: '20 min atras',
    payload: { item: 'Revisar mock' },
  },
};

export const DueDateChanged: Story = {
  args: {
    type: 'DUE_DATE_CHANGED',
    actorName: 'Joao',
    occurredAt: '1d atras',
    payload: { from: '15 abr', to: '20 abr' },
  },
};

export const PriorityChanged: Story = {
  args: {
    type: 'PRIORITY_CHANGED',
    actorName: 'Maria',
    occurredAt: '2d atras',
    payload: { from: 'Media', to: 'Alta' },
  },
};

export const Merged: Story = {
  args: {
    type: 'MERGED',
    actorName: 'Ana',
    occurredAt: '1 sem atras',
    payload: { mergedInto: 'TASK-42' },
  },
};
