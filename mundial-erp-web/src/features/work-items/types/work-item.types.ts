export type WorkItemStatus = {
  id: string;
  name: string;
  category: 'NOT_STARTED' | 'ACTIVE' | 'DONE' | 'CLOSED';
  color: string;
  icon: string | null;
  sortOrder?: number;
};

export type WorkItem = {
  id: string;
  processId: string;
  title: string;
  description: string | null;
  status: WorkItemStatus;
  statusId: string;
  itemType: 'TASK' | 'MILESTONE';
  priority: 'URGENT' | 'HIGH' | 'NORMAL' | 'LOW' | 'NONE';
  assigneeId: string | null;
  assigneeName: string | null;
  creatorId: string;
  creatorName: string | null;
  parentId: string | null;
  startDate: string | null;
  dueDate: string | null;
  completedAt: string | null;
  closedAt: string | null;
  estimatedMinutes: number | null;
  trackedMinutes: number;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type WorkItemGroup = {
  statusId: string;
  statusName: string;
  statusColor: string;
  statusIcon: string | null;
  category: 'NOT_STARTED' | 'ACTIVE' | 'DONE' | 'CLOSED';
  count: number;
  items: WorkItem[];
};

export type GroupedWorkItemsResponse = {
  groups: WorkItemGroup[];
  total: number;
};

export type WorkItemFilters = {
  processId?: string;
  statusId?: string;
  assigneeId?: string;
  priority?: string;
  search?: string;
  showClosed?: boolean;
  page?: number;
  limit?: number;
};

export type CreateWorkItemPayload = {
  processId: string;
  title: string;
  description?: string;
  statusId: string;
  itemType?: 'TASK' | 'MILESTONE';
  priority?: string;
  assigneeId?: string;
  parentId?: string;
  startDate?: string;
  dueDate?: string;
  estimatedMinutes?: number;
};

export type UpdateWorkItemPayload = Partial<CreateWorkItemPayload>;
