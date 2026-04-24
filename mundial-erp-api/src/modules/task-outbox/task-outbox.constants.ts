/**
 * Constantes do módulo task-outbox (ADR-003).
 */

/** Nome canônico da fila BullMQ de notificação do worker do outbox. */
export const QUEUE_TASK_OUTBOX = 'task-outbox' as const;

/**
 * DLQ — destinos de eventos que excederam o limite de tentativas.
 * Worker dedicado de triagem (fora do escopo do TSK-105) consumirá
 * esta fila para alertas/dashboard.
 */
export const QUEUE_TASK_OUTBOX_DLQ = 'task-outbox-dlq' as const;

/**
 * Eventos suportados pelo outbox (subset inicial — Sprint 1).
 * Espelha `TaskActivityType` onde aplicável + eventos específicos de outbox.
 * Ver PLANO-TASKS.md §5.1 e ADR-002/003.
 */
export const TASK_OUTBOX_EVENT_TYPES = [
  'CREATED',
  'RENAMED',
  'DESCRIPTION_CHANGED',
  'STATUS_CHANGED',
  'PRIORITY_CHANGED',
  'DUE_DATE_CHANGED',
  'START_DATE_CHANGED',
  'ASSIGNEE_ADDED',
  'ASSIGNEE_REMOVED',
  'WATCHER_ADDED',
  'WATCHER_REMOVED',
  'TAG_ADDED',
  'TAG_REMOVED',
  'CUSTOM_TYPE_CHANGED',
  'POINTS_CHANGED',
  'ARCHIVED',
  'UNARCHIVED',
  'MERGED_INTO',
  'DEPENDENCY_ADDED',
  'DEPENDENCY_REMOVED',
  'DEPENDENCY_UNBLOCKED',
  'LINK_ADDED',
  'LINK_REMOVED',
  'CHECKLIST_CREATED',
  'CHECKLIST_ITEM_RESOLVED',
  'ATTACHMENT_ADDED',
  'SUBTASK_ADDED',
  'SUBTASK_COMPLETED',
  'COMMENT_ADDED',
] as const;

export type TaskOutboxEventType = (typeof TASK_OUTBOX_EVENT_TYPES)[number];

/**
 * Configuração de retry/backoff. Alinhada ao ADR-003.
 *   - 3 tentativas
 *   - backoff exponencial 1s → 2s → 4s
 *   - jitter ±20% (500ms max no ADR, aqui generalizado como fração).
 */
export const TASK_OUTBOX_RETRY = {
  MAX_ATTEMPTS: 3,
  BASE_DELAY_MS: 1_000,
  JITTER_FRACTION: 0.2,
} as const;

/**
 * Concorrência do worker (ajustável via env `TASK_OUTBOX_CONCURRENCY`).
 */
export const TASK_OUTBOX_DEFAULT_CONCURRENCY = 5 as const;

/** Truncagem de payload em logs (ADR-003 observabilidade). */
export const TASK_OUTBOX_LOG_PAYLOAD_MAX_CHARS = 500 as const;
