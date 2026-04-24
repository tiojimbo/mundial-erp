/**
 * KommoReconciliationModule (PLANO-KOMMO-DASHBOARD.md §6, §8.4, Sprint 3 K3-5)
 *
 * Agrupa os 3 crons idempotentes + o drift detector.
 *
 * Depende de:
 *   - `@nestjs/schedule` (`ScheduleModule.forRoot()` já registrado no AppModule)
 *   - Futuro: `KommoApiClientModule` (Rafael) para chamar `/events`, `/leads`, `/chats`
 *   - Futuro: `KommoWebhooksService` (Rafael) ou repositório equivalente para
 *     enfileirar eventos faltantes em `QUEUE_KOMMO_WEBHOOKS`
 *
 * STATUS NESTA RODADA (Sprint 1 K1-1):
 *   - Apenas esqueleto. Os 3 crons lançam NotImplementedException quando disparam.
 *   - Por isso o módulo **NÃO** é importado em AppModule nesta rodada — o wire
 *     final fica para K3-5 (ou rodada imediatamente anterior quando o cron já
 *     puder ter handler real no-op seguro).
 */

import { Module } from '@nestjs/common';
import { KommoDriftDetectorService } from './kommo-drift-detector.service';
import { KommoReconciliationService } from './kommo-reconciliation.service';

@Module({
  providers: [KommoReconciliationService, KommoDriftDetectorService],
  exports: [KommoReconciliationService, KommoDriftDetectorService],
})
export class KommoReconciliationModule {}
