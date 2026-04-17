export type NotificationType =
  | 'task.overdue'
  | 'task.due_soon'
  | 'message'
  | 'mention'
  | 'system';

export type NotificationStatus = 'unread' | 'read' | 'cleared' | 'snoozed';

export type NotificationCategory = 'primary' | 'other';

export type Notification = {
  id: string;
  userId: string;
  type: NotificationType;
  category: NotificationCategory;
  title: string;
  description: string;
  entityId: string | null;
  entityUrl: string | null;
  status: NotificationStatus;
  snoozedUntil: string | null;
  createdAt: string;
  readAt: string | null;
  clearedAt: string | null;
};

export type InboxView = 'all' | 'primary' | 'other' | 'later' | 'cleared';

export type NotificationCounts = {
  all: number;
  primary: number;
  other: number;
  later: number;
  cleared: number;
};

export type NotificationsResponse = {
  items: Notification[];
  counts: NotificationCounts;
};

export type SnoozePayload = { until: string };

export type BulkActionPayload = { view: InboxView };

export type NotificationFilters = {
  types?: NotificationType[];
  period?: 'today' | '7days' | '30days' | 'custom';
  unreadOnly?: boolean;
};
