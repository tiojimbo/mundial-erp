import { useTasksStore } from '../stores/tasks.store';

/**
 * Cliente SSE para eventos de uma Task — TSK-803 / PLANO §16 R11.
 *
 * Responsabilidades:
 * - Conectar `/api/v1/tasks/:taskId/events` via `EventSource`.
 * - Fallback para polling (15s) quando `EventSource` nao disponivel
 *   (ex.: SSR, navegadores antigos) ou quando a conexao falha por proxy.
 * - Reconexao com backoff exponencial + jitter.
 * - Header `Last-Event-ID` para retomar idempotente (respeita o contrato
 *   do backend que mantem cursor por conexao).
 * - Cap de 3 conexoes simultaneas por usuario via `tasks.store`.
 *
 * NAO faz:
 * - Invalidacoes de cache. Quem consome o evento (`useTaskSse`) decide
 *   qual query key invalidar.
 */

export const TASK_SSE_EVENT_TYPES = [
  'activity.created',
  'task.updated',
  'task.deleted',
  'comment.created',
  'attachment.scan_completed',
] as const;

export type TaskSseEventType = (typeof TASK_SSE_EVENT_TYPES)[number];

export type TaskSseEvent = {
  id?: string;
  type: TaskSseEventType;
  data: unknown;
};

export type TaskSseClientOptions = {
  taskId: string;
  /** Base URL da API (sem `/api/v1`). Default: process.env.NEXT_PUBLIC_API_URL. */
  baseUrl?: string;
  /** Token JWT — opcional; server-sent-events nao suporta headers custom no EventSource padrao, entao e enviado via query `?token=`. */
  token?: string;
  onEvent: (event: TaskSseEvent) => void;
  onError?: (error: Error) => void;
  onOpen?: () => void;
  onClose?: () => void;
};

const BACKOFF_STEPS_MS = [1_000, 2_000, 4_000, 8_000, 16_000] as const;
const POLLING_INTERVAL_MS = 15_000;

function jitter(base: number): number {
  const delta = base * 0.2;
  return Math.round(base + (Math.random() * 2 - 1) * delta);
}

function resolveBaseUrl(baseUrl?: string): string {
  const raw =
    baseUrl ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
  if (raw.endsWith('/api/v1')) return raw;
  if (raw.endsWith('/api/v1/')) return raw.slice(0, -1);
  const trimmed = raw.endsWith('/') ? raw.slice(0, -1) : raw;
  return `${trimmed}/api/v1`;
}

export class TaskSSEClient {
  private readonly taskId: string;

  private readonly baseUrl: string;

  private readonly token: string | undefined;

  private readonly handlers: Required<
    Pick<TaskSseClientOptions, 'onEvent'>
  > &
    Pick<TaskSseClientOptions, 'onError' | 'onOpen' | 'onClose'>;

  private eventSource: EventSource | null = null;

  private pollingTimer: ReturnType<typeof setInterval> | null = null;

  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  private lastEventId: string | null = null;

  private attempts = 0;

  private closed = false;

  private registered = false;

  constructor(options: TaskSseClientOptions) {
    this.taskId = options.taskId;
    this.baseUrl = resolveBaseUrl(options.baseUrl);
    this.token = options.token;
    this.handlers = {
      onEvent: options.onEvent,
      onError: options.onError,
      onOpen: options.onOpen,
      onClose: options.onClose,
    };
  }

  connect(): void {
    if (this.closed) return;

    const store = useTasksStore.getState();
    if (!this.registered) {
      const admitted = store.registerSseConnection(this.taskId);
      if (!admitted) {
        // Excedeu o cap → degrada para polling sem contar no limite.
        this.startPolling();
        return;
      }
      this.registered = true;
    }

    if (typeof window === 'undefined' || typeof EventSource === 'undefined') {
      this.startPolling();
      return;
    }

    try {
      const url = this.buildStreamUrl();
      const source = new EventSource(url, { withCredentials: false });
      this.eventSource = source;

      source.onopen = () => {
        this.attempts = 0;
        this.handlers.onOpen?.();
      };

      const onMessage = (event: MessageEvent, type?: TaskSseEventType) => {
        if (event.lastEventId) this.lastEventId = event.lastEventId;
        const resolvedType =
          type ?? ((event as MessageEvent).type as TaskSseEventType);
        let parsed: unknown = event.data;
        if (typeof event.data === 'string') {
          try {
            parsed = JSON.parse(event.data);
          } catch {
            parsed = event.data;
          }
        }
        this.handlers.onEvent({
          id: event.lastEventId || undefined,
          type: resolvedType,
          data: parsed,
        });
      };

      for (const type of TASK_SSE_EVENT_TYPES) {
        source.addEventListener(type, (e) =>
          onMessage(e as MessageEvent, type),
        );
      }

      source.onerror = () => {
        this.handlers.onError?.(
          new Error(`SSE error on task ${this.taskId}`),
        );
        this.teardownEventSource();
        if (this.closed) return;
        this.scheduleReconnect();
      };
    } catch (err) {
      this.handlers.onError?.(
        err instanceof Error ? err : new Error(String(err)),
      );
      this.scheduleReconnect();
    }
  }

  close(): void {
    this.closed = true;
    this.teardownEventSource();
    this.stopPolling();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.registered) {
      useTasksStore.getState().unregisterSseConnection(this.taskId);
      this.registered = false;
    }
    this.handlers.onClose?.();
  }

  private buildStreamUrl(): string {
    const url = new URL(`${this.baseUrl}/tasks/${this.taskId}/events`);
    if (this.lastEventId) url.searchParams.set('lastEventId', this.lastEventId);
    if (this.token) url.searchParams.set('token', this.token);
    return url.toString();
  }

  private scheduleReconnect(): void {
    const step =
      BACKOFF_STEPS_MS[
        Math.min(this.attempts, BACKOFF_STEPS_MS.length - 1)
      ];
    this.attempts += 1;
    const delay = jitter(step);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }

  private teardownEventSource(): void {
    if (this.eventSource) {
      try {
        this.eventSource.close();
      } catch {
        // ignore
      }
      this.eventSource = null;
    }
  }

  private startPolling(): void {
    if (this.pollingTimer) return;
    this.pollingTimer = setInterval(() => {
      // Emissao sintetica → o hook consumidor invalida `activities` e `detail`.
      this.handlers.onEvent({
        type: 'task.updated',
        data: { source: 'polling', taskId: this.taskId },
      });
    }, POLLING_INTERVAL_MS);
  }

  private stopPolling(): void {
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
      this.pollingTimer = null;
    }
  }
}
