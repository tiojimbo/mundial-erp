import type { TaskEventContext } from '../events/task-events.types';

export interface AutomationJobData {
  automationId: string;
  workspaceId: string;
  trigger: string;
  context: TaskEventContext;
  automationDepth: number;
}
