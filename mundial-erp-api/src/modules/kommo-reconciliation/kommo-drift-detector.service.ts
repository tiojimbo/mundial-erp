/**
 * KommoDriftDetectorService (PLANO-KOMMO-DASHBOARD.md §8.4, Sprint 3 K3-5)
 *
 * Compara contadores agregados (leads/conversations/messages) entre Kommo
 * remoto e o replica local, por workspaceId + janela temporal.
 *
 * Drift threshold:
 *   - drift < 0.5% → log.info (healthy)
 *   - 0.5% ≤ drift < 1% → log.warn (monitor)
 *   - drift ≥ 1% → log.error + SLI alarm (P1, ADR-008)
 *
 * STATUS NESTA RODADA (Sprint 1 K1-1):
 *   - Classe vazia. Injected por `KommoReconciliationService.reconcileDaily()`
 *     em K3-5.
 *
 * TODO(Sprint 3 K3-5):
 *   - `detectDailyDrift(workspaceId: string): Promise<DriftReport>`
 *     - COUNT local vs `GET /leads?filter[created_at][...]` / `/chats` / `/events`
 *     - Retorna `{ entity, local, remote, diff, pct, severity }`
 *   - `emitAlarm(report: DriftReport): void` — wire com sistema de alertas
 *     (Grafana SLI + webhook interno)
 */

import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class KommoDriftDetectorService {
  private readonly logger = new Logger(KommoDriftDetectorService.name);

  // TODO(Sprint 3 K3-5): implementar detectDailyDrift + emitAlarm.
}
