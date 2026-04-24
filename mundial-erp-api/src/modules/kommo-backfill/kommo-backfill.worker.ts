/**
 * KommoBackfillWorker (PLANO-KOMMO-DASHBOARD.md §8.5, Sprint 3 K3-1..K3-4)
 *
 * BullMQ processor que consome a fila `kommo-backfill`. Backfill histórico
 * idempotente e retomável (até 90 dias por account), executado sob demanda
 * via `POST /kommo/accounts/:id/backfill` (Rafael, K2-4) ou auto-disparado
 * após `POST /kommo/connect` completar.
 *
 * Comportamento alvo (K3-1..K3-4):
 *   1. Ler cursor em `KommoSyncCheckpoint(workspaceId, 'backfill-<entity>')`
 *   2. Paginar `GET /events` / `/leads` / `/chats` em blocos de 100 (protocolo
 *      HAL+JSON — ver `normalizeListResponse` referenciado no inventário
 *      externo: docs/kommo-external-scaffolding-inventory.md)
 *   3. Para cada lote:
 *      - Transformar payload -> upsert via repository
 *      - Atualizar cursor (`$transaction` para atomicidade)
 *      - Publicar progresso SSE (`kommo-backfill-progress`)
 *   4. Respeitar rate-limit (7 req/s global via `KommoRateLimiterService`)
 *   5. Idempotente: reiniciar do cursor não duplica linhas (upsert por
 *      `kommoExternalId` unique)
 *
 * STATUS NESTA RODADA (Sprint 1 K1-1):
 *   - Apenas esqueleto. `process()` lança NotImplementedException.
 *   - Depende de: (a) Larissa — todos os 11 models; (b) Rafael — KommoApiClient
 *     com paginador e rate-limiter; (c) SSE de progresso (opcional, K3-3).
 */

import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger, NotImplementedException } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_KOMMO_BACKFILL } from '../queue/queue.constants';

/**
 * Payload do job de backfill. Forma provisória — será finalizada em K3-1.
 */
export interface KommoBackfillJobData {
  /** Workspace dono da account. */
  readonly workspaceId: string;
  /** Account Kommo a sincronizar. */
  readonly accountId: string;
  /** Janela em dias a retroceder (default 90, cap 90). */
  readonly daysBack?: number;
  /** Retomada: se true, ignora cursor e inicia de `now - daysBack`. */
  readonly restart?: boolean;
  /** Correlação para tracing/SSE. */
  readonly requestId?: string;
}

@Processor(QUEUE_KOMMO_BACKFILL)
@Injectable()
export class KommoBackfillWorker extends WorkerHost {
  private readonly logger = new Logger(KommoBackfillWorker.name);

  async process(job: Job<KommoBackfillJobData>): Promise<void> {
    const { workspaceId, accountId, daysBack, restart, requestId } = job.data;
    this.logger.log({
      message: 'kommo-backfill job received (stub)',
      jobId: job.id,
      workspaceId,
      accountId,
      daysBack,
      restart,
      requestId,
    });

    // TODO(Sprint 3 K3-1..K3-4): implementar pipeline de backfill real.
    //   1. Carregar KommoAccount + KommoSyncCheckpoint
    //   2. Paginar /events, /leads, /chats (rate-limit 7 req/s)
    //   3. Upsert via repositories correspondentes
    //   4. Atualizar cursor a cada lote ($transaction)
    //   5. Publicar progresso SSE (opcional)
    throw new NotImplementedException(
      'KommoBackfillWorker will be implemented in Sprint 3 K3-1..K3-4.',
    );
  }
}
