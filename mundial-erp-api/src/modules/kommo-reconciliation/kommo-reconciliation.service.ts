/**
 * KommoReconciliationService (PLANO-KOMMO-DASHBOARD.md §8.4, Sprint 3 K3-5)
 *
 * Três crons idempotentes (ADR-008 — webhook-primary + cron-secondary) que
 * cobrem o gap de webhooks perdidos:
 *
 *   - reconcile5min  (`* /5 * * * *`): janela curta — últimos 10min de eventos
 *     via `GET /events?filter[created_at][from]=...`, dedup contra
 *     `KommoWebhookEvent.eventId`, enqueue faltantes em QUEUE_KOMMO_WEBHOOKS.
 *   - reconcileHourly (`0 * * * *`): janela média — verifica counts de
 *     leads/conversations das últimas 2h e reaplica diffs.
 *   - reconcileDaily  (`0 3 * * *`): janela longa — varredura 24h, detecta
 *     drift > 1% via `KommoDriftDetectorService` e dispara alerta P1.
 *
 * Idempotência (squad-kommo §12):
 *   - Cursor persistido em `KommoSyncCheckpoint(workspaceId, entity)`
 *   - Queries sempre `createdAt >= cursor - safetyWindow` (overlap intencional)
 *   - Enqueue de eventos já processados é dedup'd no worker (eventId unique)
 *
 * STATUS NESTA RODADA (Sprint 1 K1-1):
 *   - Esqueleto. Os 3 métodos lançam NotImplementedException.
 *   - Depende de: (a) Larissa — `KommoSyncCheckpoint`, `KommoWebhookEvent`;
 *     (b) Rafael — `KommoApiClient` com paginação de `/events`;
 *     (c) `KommoDriftDetectorService` (stub nesta rodada).
 *
 * @nestjs/schedule já é registrado via `ScheduleModule.forRoot()` no
 * AppModule — crons disparam assim que o provider é importado. Por segurança,
 * o wire em AppModule é feito **apenas quando a implementação real chegar**
 * (próxima rodada do Mateus ou do Rafael). Nesta rodada o módulo existe mas
 * NÃO é importado pelo AppModule — intencional: evita cron spam de
 * NotImplementedException em dev.
 */

import { Injectable, Logger, NotImplementedException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class KommoReconciliationService {
  private readonly logger = new Logger(KommoReconciliationService.name);

  /**
   * Reconciliação janela curta (últimos ~10min). Roda a cada 5 minutos.
   *
   * TODO(Sprint 3 K3-5): implementar loop por `KommoAccount` ativa:
   *   1. Carregar cursor `KommoSyncCheckpoint(workspaceId, 'events-5min')`
   *   2. GET /events?filter[created_at][from]=cursor-60s&to=now
   *   3. Para cada evento, verificar se existe `KommoWebhookEvent.eventId`
   *   4. Faltantes: criar row + enqueue em QUEUE_KOMMO_WEBHOOKS
   *   5. Atualizar cursor
   */
  @Cron(CronExpression.EVERY_5_MINUTES, { name: 'kommo-recon-5min' })
  async reconcile5min(): Promise<void> {
    this.logger.log({ message: 'kommo-recon-5min tick (stub)' });
    throw new NotImplementedException(
      'KommoReconciliationService.reconcile5min will be implemented in Sprint 3 K3-5.',
    );
  }

  /**
   * Reconciliação janela média. Roda no minuto 0 de cada hora.
   *
   * TODO(Sprint 3 K3-5): implementar check de contadores por pipeline/agente
   * nas últimas 2h, comparar com local, enqueuar diffs. Cobertura para
   * eventos ordenados fora de sequência.
   */
  @Cron(CronExpression.EVERY_HOUR, { name: 'kommo-recon-hourly' })
  async reconcileHourly(): Promise<void> {
    this.logger.log({ message: 'kommo-recon-hourly tick (stub)' });
    throw new NotImplementedException(
      'KommoReconciliationService.reconcileHourly will be implemented in Sprint 3 K3-5.',
    );
  }

  /**
   * Reconciliação diária — roda 03:00 (UTC). Detecta drift agregado via
   * `KommoDriftDetectorService`; drift > 1% => log.error + SLI alarm.
   *
   * TODO(Sprint 3 K3-5): integrar com drift detector e, se ativado, rodar
   * backfill targeted automatico (com feature flag de segurança).
   */
  @Cron('0 3 * * *', { name: 'kommo-recon-daily' })
  async reconcileDaily(): Promise<void> {
    this.logger.log({ message: 'kommo-recon-daily tick (stub)' });
    throw new NotImplementedException(
      'KommoReconciliationService.reconcileDaily will be implemented in Sprint 3 K3-5.',
    );
  }
}
