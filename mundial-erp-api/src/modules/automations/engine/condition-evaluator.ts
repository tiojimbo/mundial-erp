import { ConditionOperator } from '../dtos/automation-condition.dto';

export interface Condition {
  field: string;
  operator: ConditionOperator;
  value?: unknown;
}

export function evaluateConditions(
  conditions: Condition[],
  taskSnapshot: Record<string, unknown>,
): boolean {
  if (!conditions || conditions.length === 0) return true;
  for (const condition of conditions) {
    if (!evaluateOne(condition, taskSnapshot)) return false;
  }
  return true;
}

function evaluateOne(
  condition: Condition,
  snapshot: Record<string, unknown>,
): boolean {
  const actual = readField(snapshot, condition.field);
  const expected = condition.value;

  switch (condition.operator) {
    case ConditionOperator.EQ:
      return actual === expected;
    case ConditionOperator.NEQ:
      return actual !== expected;
    case ConditionOperator.GT:
      return isComparable(actual, expected) && (actual as number) > (expected as number);
    case ConditionOperator.GTE:
      return isComparable(actual, expected) && (actual as number) >= (expected as number);
    case ConditionOperator.LT:
      return isComparable(actual, expected) && (actual as number) < (expected as number);
    case ConditionOperator.LTE:
      return isComparable(actual, expected) && (actual as number) <= (expected as number);
    case ConditionOperator.IN:
      return Array.isArray(expected) && expected.includes(actual);
    case ConditionOperator.NOT_IN:
      return Array.isArray(expected) && !expected.includes(actual);
    case ConditionOperator.CONTAINS:
      if (Array.isArray(actual)) return actual.includes(expected);
      if (typeof actual === 'string')
        return actual.includes(String(expected ?? ''));
      return false;
    case ConditionOperator.NOT_CONTAINS:
      if (Array.isArray(actual)) return !actual.includes(expected);
      if (typeof actual === 'string')
        return !actual.includes(String(expected ?? ''));
      return true;
    case ConditionOperator.IS_NULL:
      return actual === null || actual === undefined;
    case ConditionOperator.IS_NOT_NULL:
      return actual !== null && actual !== undefined;
    default:
      return false;
  }
}

function readField(
  snapshot: Record<string, unknown>,
  path: string,
): unknown {
  if (!path.includes('.')) return snapshot[path];
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc == null || typeof acc !== 'object') return undefined;
    return (acc as Record<string, unknown>)[key];
  }, snapshot);
}

function isComparable(a: unknown, b: unknown): boolean {
  return (
    (typeof a === 'number' || a instanceof Date) &&
    (typeof b === 'number' || b instanceof Date)
  );
}
