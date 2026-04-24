import { api } from '@/lib/api';
import type {
  ApiResponse,
  PaginatedResponse,
  CursorPaginatedResponse,
} from '@/types/api.types';
import type {
  Task,
  TaskFilters,
  CreateTaskPayload,
  UpdateTaskPayload,
} from '../types/task.types';

/**
 * Sprint 0 (TSK-102 foundation) — stub de service para `/api/v1/tasks`.
 * Metodos ja assinados e tipados; corpos retornam promessas que rejeitam
 * com TODO claro para evitar uso acidental antes da Sprint 1.
 *
 * Endpoints conforme PLANO-TASKS.md §7.1 e §7.2.
 */

type TasksListResponse =
  | PaginatedResponse<Task>
  | CursorPaginatedResponse<Task>;

function buildTaskParams(filters?: TaskFilters): Record<string, unknown> {
  const params: Record<string, unknown> = {};
  if (!filters) return params;
  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined) continue;
    params[key] = value;
  }
  return params;
}

/**
 * Unwrap defensivo do envelope da API.
 *
 * Historico: services do squad Tasks retornaram por um periodo um envelope
 * proprio `{ data, meta }` ao mesmo tempo que o `ResponseInterceptor` global
 * aplicava o envelope canonico — resultado: `res.data.data.data` era o DTO
 * real, e `res.data.data.id` vinha `undefined`, quebrando navegacoes tipo
 * `router.push('/tasks/${task.id}')`.
 *
 * Este helper aceita ambos os shapes (single e double envelope) e extrai a
 * payload real, tornando a migracao do backend transparente para o cliente.
 */
function unwrapEnvelope<T>(body: unknown): T {
  const outer = (body as { data?: unknown })?.data;
  if (
    outer !== null &&
    typeof outer === 'object' &&
    'data' in outer &&
    'meta' in outer
  ) {
    return (outer as { data: T }).data;
  }
  return outer as T;
}

export const tasksService = {
  async list(filters?: TaskFilters): Promise<TasksListResponse> {
    // TODO Sprint 1 (TSK-110): habilitar chamada real quando endpoint existir.
    const { data } = await api.get<TasksListResponse>('/tasks', {
      params: buildTaskParams(filters),
    });
    return data;
  },

  async getById(taskId: string, include?: string[]): Promise<Task> {
    if (!taskId || taskId === 'undefined') {
      // Guard: evita ir ao backend com taskId invalido. Um `useTask('undefined')`
      // indica bug upstream (callback chamado sem id resolvido); retorna erro
      // claro em vez de consumir rate limit.
      throw new Error(`getById recebeu taskId invalido: "${taskId}"`);
    }
    const params: Record<string, unknown> = {};
    if (include && include.length > 0) params.include = include.join(',');
    const res = await api.get<unknown>(`/tasks/${taskId}`, { params });
    return unwrapEnvelope<Task>(res.data);
  },

  async create(payload: CreateTaskPayload): Promise<Task> {
    // `processId` e path param — NAO pode ir no body (backend usa
    // `ValidationPipe({forbidNonWhitelisted:true})` e o CreateTaskDto nao
    // declara `processId`, entao prop extra vira 400).
    const { processId, ...body } = payload;
    const res = await api.post<unknown>(
      `/processes/${processId}/tasks`,
      body,
    );
    return unwrapEnvelope<Task>(res.data);
  },

  async update(taskId: string, payload: UpdateTaskPayload): Promise<Task> {
    const { data } = await api.patch<ApiResponse<Task>>(
      `/tasks/${taskId}`,
      payload,
    );
    return data.data;
  },

  async remove(taskId: string): Promise<void> {
    await api.delete(`/tasks/${taskId}`);
  },

  async archive(taskId: string): Promise<void> {
    await api.post(`/tasks/${taskId}/archive`);
  },

  async unarchive(taskId: string): Promise<void> {
    await api.post(`/tasks/${taskId}/unarchive`);
  },

  async merge(
    targetTaskId: string,
    sourceTaskIds: string[],
    idempotencyKey?: string,
  ): Promise<Task> {
    const headers: Record<string, string> = {};
    if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey;
    const { data } = await api.post<ApiResponse<Task>>(
      `/tasks/${targetTaskId}/merge`,
      { sourceTaskIds },
      { headers },
    );
    return data.data;
  },
};
