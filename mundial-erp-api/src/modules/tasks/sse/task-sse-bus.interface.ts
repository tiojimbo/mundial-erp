/**
 * Contratos do barramento SSE de Tasks (PLANO-TASKS §7.5 / ADR-002).
 *
 * O bus abstrai a entrega live de eventos da projecao do outbox ate o
 * controller SSE, evitando acoplamento direto a `EventEmitter2` nas camadas
 * de dominio. `publish` e chamado pelo worker do outbox APOS o insert
 * bem-sucedido em `WorkItemActivity`; `subscribe` e chamado por
 * `TasksEventsService.stream` para alimentar o Observable do controller.
 *
 * `TaskSseServerEventType` espelha o contrato consumido pelo frontend
 * (`features/tasks/lib/sse-client.ts` — `TaskSseEventType`). Mudancas aqui
 * sao breaking — coordenar com squad FE via RFC.
 *
 * Regra dura: somente o worker do outbox pode publicar (ADR-002). Leitura e
 * livre para subscribers dentro do proprio modulo tasks/sse.
 */

/** Simbolo DI usado por providers que dependem do bus (worker + service SSE). */
export const TASK_SSE_BUS = Symbol('TaskSseBus');

/**
 * Tipos de evento emitidos para clientes SSE conectados em `/tasks/:taskId/events`.
 * Espelha `TASK_SSE_EVENT_TYPES` em `mundial-erp-web/src/features/tasks/lib/sse-client.ts`.
 */
export type TaskSseServerEventType =
  | 'activity.created'
  | 'task.updated'
  | 'task.deleted'
  | 'comment.created'
  | 'attachment.scan_completed';

/**
 * Envelope transportado pelo bus e emitido como `MessageEvent` pelo controller.
 * O `id` DEVE ser o `WorkItemActivity.createdAt.toISOString()` (usado pelo cliente
 * como `Last-Event-ID` no reconnect — ver `sse-client.ts`).
 */
export interface TaskSseServerEvent {
  id: string;
  type: TaskSseServerEventType;
  data: Record<string, unknown>;
}

/** Callback assinado por subscribers; recebe 1 evento por chamada. */
export type TaskSseHandler = (event: TaskSseServerEvent) => void;

/**
 * Barramento in-process para SSE de Tasks. Implementacao default via
 * `LocalEmitterBus` (EventEmitter2). Futuras implementacoes cluster-safe
 * (Redis Pub/Sub, Postgres LISTEN/NOTIFY) plugam no mesmo contrato.
 */
export interface TaskSseBus {
  /**
   * Inscreve `handler` em eventos de `taskId`. Retorna funcao de unsubscribe
   * que DEVE ser chamada no teardown do Observable SSE para evitar leak.
   */
  subscribe(taskId: string, handler: TaskSseHandler): () => void;

  /** Publica `event` para todos os handlers inscritos em `taskId`. */
  publish(taskId: string, event: TaskSseServerEvent): void;
}
