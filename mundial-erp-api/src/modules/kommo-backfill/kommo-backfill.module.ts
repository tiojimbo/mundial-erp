/**
 * KommoBackfillModule (PLANO-KOMMO-DASHBOARD.md §6, §8.5, Sprint 3 K3-1..K3-4)
 *
 * Agrupa o worker que consome a fila `kommo-backfill`. Separado de
 * `KommoWorkersModule` (webhooks) porque:
 *   (a) concorrência e rate-limit são independentes (backfill é bulk + lento;
 *       webhook é event-driven + rápido);
 *   (b) permite feature-flag granular (KOMMO_BACKFILL_ENABLED) sem afetar
 *       processamento de webhooks ao vivo;
 *   (c) facilita rollback por worker.
 *
 * Depende de:
 *   - QueueModule (fila `kommo-backfill` declarada em queue.constants.ts)
 *   - Futuro: KommoApiClientModule, repositórios dos 11 models.
 *
 * STATUS NESTA RODADA (Sprint 1 K1-1):
 *   - Apenas o worker como provider em stub.
 *   - **NÃO** importado no AppModule — wire final em rodada futura.
 */

import { Module } from '@nestjs/common';
import { KommoBackfillWorker } from './kommo-backfill.worker';

@Module({
  providers: [KommoBackfillWorker],
  exports: [KommoBackfillWorker],
})
export class KommoBackfillModule {}
