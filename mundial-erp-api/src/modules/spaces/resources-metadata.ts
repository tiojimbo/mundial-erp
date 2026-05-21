export const RESOURCE_FILTER_OPERATORS = [
  'IS',
  'IS_NOT',
  'CONTAINS',
  'NOT_CONTAINS',
  'EQUALS',
  'GREATER_THAN',
  'LESS_THAN',
  'BETWEEN',
  'IS_SET',
  'IS_NOT_SET',
] as const;

export const RESOURCE_FILTER_FIELDS = [
  'STATUS',
  'ASSIGNEE',
  'DUE_DATE',
  'PRIORITY',
  'TASK_TYPE',
  'NAME',
  'DESCRIPTION',
  'CREATOR',
  'CREATED_AT',
  'LIST',
  'ASSIGNED_COMMENTS',
  'TAGS',
  'STATUS_IS_CLOSED',
] as const;

export const RESOURCE_SORT_OPTIONS = [
  'NAME',
  'CREATED_AT',
  'DUE_DATE',
  'PRIORITY',
  'STATUS',
] as const;

export const SPACE_RESOURCES = {
  filters: RESOURCE_FILTER_FIELDS.map((field) => ({
    field,
    operators: RESOURCE_FILTER_OPERATORS,
  })),
  sortOptions: RESOURCE_SORT_OPTIONS.map((field) => ({ field })),
};
