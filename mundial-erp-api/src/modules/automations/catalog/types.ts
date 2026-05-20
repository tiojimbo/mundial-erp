export type AutomationCategory =
  | 'task'
  | 'assignment'
  | 'tag'
  | 'comment'
  | 'subtask'
  | 'custom-field'
  | 'schedule';

export interface TriggerDef {
  id: string;
  label: string;
  category: AutomationCategory;
}

export type ParamType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'date'
  | 'enum'
  | 'reference'
  | 'json';

export interface ActionParamDef {
  name: string;
  type: ParamType;
  required: boolean;
  description?: string;
  enumValues?: string[];
  referenceType?:
    | 'user'
    | 'list'
    | 'status'
    | 'tag'
    | 'task-type'
    | 'custom-field'
    | 'channel';
}

export interface ActionDef {
  id: string;
  label: string;
  category: AutomationCategory | 'navigation' | 'content' | 'integration';
  params: ActionParamDef[];
  notImplemented?: boolean;
}
