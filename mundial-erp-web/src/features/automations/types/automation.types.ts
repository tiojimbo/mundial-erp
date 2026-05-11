export type AutomationScopeType = 'WORKSPACE' | 'SPACE' | 'FOLDER' | 'LIST';

export type ConditionOperator =
  | 'EQ'
  | 'NEQ'
  | 'GT'
  | 'GTE'
  | 'LT'
  | 'LTE'
  | 'IN'
  | 'NOT_IN'
  | 'CONTAINS'
  | 'NOT_CONTAINS'
  | 'IS_NULL'
  | 'IS_NOT_NULL';

export type AutomationAction = {
  type: string;
  params: Record<string, unknown>;
};

export type AutomationCondition = {
  field: string;
  operator: ConditionOperator;
  value?: unknown;
};

export type Automation = {
  id: string;
  workspaceId: string;
  createdById: string;
  name: string;
  description: string | null;
  trigger: string;
  scopeType: AutomationScopeType;
  scopeId: string | null;
  compiledActions: AutomationAction[];
  conditions: AutomationCondition[];
  isActive: boolean;
  executionCount: number;
  lastExecutedAt: string | null;
  cronExpression: string | null;
  timezone: string | null;
  nextRunAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AutomationTriggerDef = {
  id: string;
  label: string;
  category: string;
};

export type AutomationActionDef = {
  id: string;
  label: string;
  category?: string;
  params?: string[];
};

export type AutomationStatusRow = {
  id: string;
  name: string;
  category: string;
  color: string | null;
  icon: string | null;
  sortOrder: number;
  isDefault: boolean;
  spaceId: string;
  folderId: string | null;
  space: { id: string; name: string };
  folder: { id: string; name: string; spaceId: string } | null;
};

export type AutomationStatusesByScope = {
  spaces: Array<{
    id: string;
    name: string;
    statuses: AutomationStatusRow[];
  }>;
  folders: Array<{
    id: string;
    name: string;
    spaceId: string;
    statuses: AutomationStatusRow[];
  }>;
};

export type CreateAutomationPayload = {
  name: string;
  description?: string;
  trigger: string;
  scopeType: AutomationScopeType;
  scopeId?: string;
  compiledActions: AutomationAction[];
  conditions?: AutomationCondition[];
  isActive?: boolean;
  cronExpression?: string;
  timezone?: string;
};

export type UpdateAutomationPayload = Partial<CreateAutomationPayload>;

export const CONDITION_OPERATORS: ConditionOperator[] = [
  'EQ',
  'NEQ',
  'GT',
  'GTE',
  'LT',
  'LTE',
  'IN',
  'NOT_IN',
  'CONTAINS',
  'NOT_CONTAINS',
  'IS_NULL',
  'IS_NOT_NULL',
];

export const SCOPE_TYPES: AutomationScopeType[] = [
  'WORKSPACE',
  'SPACE',
  'FOLDER',
  'LIST',
];
