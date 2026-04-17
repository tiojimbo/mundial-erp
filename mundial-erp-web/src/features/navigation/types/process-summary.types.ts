export type StatusCategory = 'NOT_STARTED' | 'ACTIVE' | 'DONE' | 'CLOSED';

export type WorkItemSummary = {
  id: string;
  title: string;
  statusId: string;
  priority: 'URGENT' | 'HIGH' | 'NORMAL' | 'LOW' | 'NONE';
  assigneeId: string | null;
  assigneeName?: string | null;
  startDate: string | null;
  dueDate: string | null;
  sortOrder: number;
};

export type StatusGroupSummary = {
  statusId: string;
  statusName: string;
  statusColor: string;
  statusCategory: StatusCategory;
  count: number;
  items: WorkItemSummary[];
};

export type ProcessSummaryList = {
  id: string;
  name: string;
  slug: string;
  processType: 'LIST';
  featureRoute: string | null;
  description: string | null;
  isPrivate: boolean;
  areaId: string | null;
  areaName: string | null;
  totalItems: number;
  groups: StatusGroupSummary[];
};

export type ProcessSummaryBpm = {
  id: string;
  name: string;
  slug: string;
  processType: 'BPM';
  featureRoute: string | null;
  description: string | null;
  isPrivate: boolean;
  areaId: string | null;
  areaName: string | null;
  totalOrders: number;
  ordersByStatus: Record<string, number>;
  pendingActivities: number;
  pendingHandoffs: number;
};

export type ProcessSummary = ProcessSummaryList | ProcessSummaryBpm;

export type DepartmentDetail = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  isPrivate: boolean;
  isDefault: boolean;
  isProtected: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  areas: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    isPrivate: boolean;
    processCount: number;
  }[];
  directProcesses: {
    id: string;
    name: string;
    slug: string;
    processType: 'LIST' | 'BPM';
    featureRoute: string | null;
    description: string | null;
    isPrivate: boolean;
  }[];
};

export type AreaDetail = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  departmentId: string;
  departmentName: string;
  departmentSlug: string;
  isPrivate: boolean;
  icon: string | null;
  color: string | null;
  useSpaceStatuses: boolean;
  sortOrder: number;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
  processes: {
    id: string;
    name: string;
    slug: string;
    processType: 'LIST' | 'BPM';
    featureRoute: string | null;
    description: string | null;
    isPrivate: boolean;
  }[];
};
