export type MyTaskStatus = {
  id: string;
  name: string;
  color: string;
  type: string;
};

export type MyTaskList = {
  id: string;
  name: string;
  folder: string | null;
};

export type MyTaskAssignee = {
  id: string;
  name: string;
  email: string;
};

export type MyTask = {
  id: string;
  name: string;
  priority: string | null;
  dueDate: string | null;
  startDate: string | null;
  status: MyTaskStatus;
  list: MyTaskList;
  assignees: MyTaskAssignee[];
  taskType: string | null;
  createdAt: string;
  dateDone: string | null;
};

export type MyTasksDayGroup = {
  id: string;
  date: string;
  label: string;
  tasks: MyTask[];
};

export type MyTasksSummary = {
  overdueCount: number;
  dueTodayCount: number;
  dueTomorrowCount: number;
  dueNextSevenDaysCount: number;
  dueNextDaysCount: number;
  upcomingCount: number;
  noDueDateCount: number;
  completedCount: number;
  totalActive: number;
};

export type MyTasksResponse = {
  summary: MyTasksSummary;
  overdue: MyTask[];
  dueToday: MyTask[];
  dueTomorrow: MyTask[];
  dueByDay: MyTasksDayGroup[];
  upcoming: MyTask[];
  noDueDate: MyTask[];
  recentlyCompleted: MyTask[];
};
