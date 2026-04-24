import type { TaskFilters } from '../types/task.types';
import { taskFiltersSchema } from '../schemas/task.schema';

/**
 * Serialize/deserialize `TaskFilters` para URLSearchParams.
 *
 * Convencao:
 * - Arrays: repeticao da key (`?statuses=a&statuses=b`).
 * - Booleans: `true`/`false`.
 * - Datas: ISO string.
 * - Chaves nao preenchidas sao omitidas (evita URLs poluidas).
 *
 * Deeplink URL (PLANO §10.3): sempre que `TaskFilters` muda, o caller chama
 * `serializeTaskFilters` e atualiza a query string via `router.replace`.
 */

const ARRAY_KEYS: ReadonlyArray<keyof TaskFilters> = [
  'processIds',
  'areaIds',
  'departmentIds',
  'statuses',
  'assigneeIds',
  'tagIds',
  'customTypeIds',
  'priority',
];

const BOOLEAN_KEYS: ReadonlyArray<keyof TaskFilters> = [
  'archived',
  'includeClosed',
];

const NUMBER_KEYS: ReadonlyArray<keyof TaskFilters> = ['page', 'limit'];

export function serializeTaskFilters(filters: TaskFilters): URLSearchParams {
  const params = new URLSearchParams();
  for (const [rawKey, rawValue] of Object.entries(filters)) {
    if (rawValue === undefined || rawValue === null) continue;
    const key = rawKey as keyof TaskFilters;
    if (ARRAY_KEYS.includes(key) && Array.isArray(rawValue)) {
      for (const item of rawValue) {
        if (item !== undefined && item !== null && item !== '') {
          params.append(key, String(item));
        }
      }
      continue;
    }
    if (typeof rawValue === 'boolean') {
      params.set(key, rawValue ? 'true' : 'false');
      continue;
    }
    if (typeof rawValue === 'number') {
      params.set(key, String(rawValue));
      continue;
    }
    if (typeof rawValue === 'string' && rawValue.length > 0) {
      params.set(key, rawValue);
      continue;
    }
  }
  return params;
}

export function deserializeTaskFilters(
  search: string | URLSearchParams,
): TaskFilters {
  const params =
    typeof search === 'string' ? new URLSearchParams(search) : search;
  const raw: Record<string, unknown> = {};

  for (const key of ARRAY_KEYS) {
    const values = params.getAll(key);
    if (values.length > 0) raw[key] = values;
  }
  for (const key of BOOLEAN_KEYS) {
    const value = params.get(key);
    if (value === 'true') raw[key] = true;
    else if (value === 'false') raw[key] = false;
  }
  for (const key of NUMBER_KEYS) {
    const value = params.get(key);
    if (value !== null && value !== '') {
      const parsed = Number(value);
      if (!Number.isNaN(parsed)) raw[key] = parsed;
    }
  }

  // Strings "one-off".
  const stringKeys = [
    'cursor',
    'search',
    'dueDateGt',
    'dueDateLt',
    'createdGt',
    'createdLt',
    'updatedGt',
    'updatedLt',
    'parentId',
    'orderBy',
    'direction',
  ] as const;
  for (const key of stringKeys) {
    const value = params.get(key);
    if (value !== null && value !== '') raw[key] = value;
  }

  // `safeParse`: invalidacoes individuais nao poluem a UI; filtros validos
  // passam, os demais ficam de fora e o usuario reaplica manualmente.
  const parsed = taskFiltersSchema.safeParse(raw);
  if (parsed.success) return parsed.data;
  return {} as TaskFilters;
}
