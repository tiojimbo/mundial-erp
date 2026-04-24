export const QUEUE_SYNC = 'sync';
export const QUEUE_REPORTS = 'reports';
export const QUEUE_SEARCH_REINDEX = 'search-reindex';

/**
 * Kommo integration queues (PLANO-KOMMO-DASHBOARD.md §6, Sprint 1 K1-1).
 *
 * - QUEUE_KOMMO_WEBHOOKS: processa eventos recebidos via
 *   `POST /webhooks/kommo/:workspaceId` (10 tipos MVP, §4.1). Consumido pelo
 *   `KommoEventProcessor` em `modules/kommo-workers/`.
 * - QUEUE_KOMMO_BACKFILL: backfill histórico de 90 dias por account. Consumido
 *   pelo `KommoBackfillWorker` em `modules/kommo-backfill/`.
 *
 * Registradas em `BullModule.registerQueue` logo abaixo. Handler real é
 * entregue em Sprint 2 (K2-3) e Sprint 3 (backfill) — até lá os processors
 * lançam NotImplementedException.
 */
export const QUEUE_KOMMO_WEBHOOKS = 'kommo-webhooks';
export const QUEUE_KOMMO_BACKFILL = 'kommo-backfill';
