export type ActivityInstanceStatus =
  | 'PENDING'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'SKIPPED';

export type ActivityInstance = {
  id: string;
  activityName: string;
  processName: string;
  orderId: string;
  orderCode: string;
  clientName: string;
  assignedUserId: string;
  status: ActivityInstanceStatus;
  dueAt: string;
  startedAt: string | null;
  completedAt: string | null;
  slaMinutes: number;
  slaRemainingMinutes: number;
  checklistTotal: number;
  checklistCompleted: number;
  createdAt: string;
};

export type HandoffInstanceStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED';

export type HandoffInstance = {
  id: string;
  handoffName: string;
  processName: string;
  orderId: string;
  orderCode: string;
  clientName: string;
  fromDepartment: string;
  toDepartment: string;
  status: HandoffInstanceStatus;
  notes: string | null;
  createdAt: string;
};

export type DailyActivitiesResponse = {
  activities: ActivityInstance[];
  total: number;
};

export type PendingHandoffsResponse = {
  handoffs: HandoffInstance[];
  total: number;
};

export type HomeStats = {
  pendingActivities: number;
  inProgressOrders: number;
  pendingHandoffs: number;
};
