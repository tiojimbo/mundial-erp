export type ProcessViewType = 'LIST' | 'BOARD' | 'CALENDAR' | 'GANTT';

export type ProcessViewScope = 'workspace' | 'user';

export type ProcessView = {
  id: string;
  processId: string;
  name: string;
  viewType: ProcessViewType;
  isPinned: boolean;
  config: Record<string, unknown> & { scope?: ProcessViewScope };
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type CreateProcessViewPayload = {
  processId: string;
  name: string;
  viewType: ProcessViewType;
  config?: Record<string, unknown>;
};
