/**
 * TaskOutboxCleanupService (R14 / Sprint 8)
 *
 * Job semanal que limpa a tabela `task_outbox_events` para evitar crescimento
 * indefinido. Requisito funcional R14 do PLANO-TASKS.md:
 *   - COMPLETED > 30 dias                        -> DELETE
 *   - DEAD       > 90 dias                       -> DELETE
 *   - PENDING/PROCESSING/FAILED                  -> NUNCA tocar (worker ainda usa)
 *
 * Agendamento:
 *   `@Cron('0 3 * * 0')` — toda madrugada de domingo as 03:00 (horario do
 *   servidor; em producao roda em UTC). Janela escolhida para coincidir
 *   com trafego baixo.
 *
 * Observabilidade:
 *   - Log estruturado com { completedDeleted, deadDeleted, totalDeleted, durationMs }.
 *   - Alerta (log.error) se o total de linhas apagadas em uma unica execucao
 *     exceder `ALERT_THRESHOLD_ROWS` (= 100_000). Uma execucao saudavel deleta
 *     algumas centenas a dezenas de milhares — 100k+ indica vazamento (worker
 *     parado, enqueue em loop, etc.) e precisa de investigacao.
 *
 * Registro:
 *   Registrar este provider em `TaskOutboxModule`. O `ScheduleModule.forRoot()`
 *   precisa estar no `AppModule` (`@nestjs/schedule`) — caso nao esteja, o
 *   decorator `@Cron` simplesmente nao dispara (NestJS nao falha no boot).
 *
 * Manualmente:
 *   Metodo publico `runCleanup()` permite chamada ad-hoc via console/teste
 *   sem depender do scheduler (util para incident response).
 */

import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { TaskOutboxRepository } from './task-outbox.repository';

/**
 * Janelas de retencao (PLANO-TASKS.md §R14):
 *   - COMPLETED: 30 dias para permitir auditoria curta / debug retroativo.
 *   - DEAD:      90 dias para SRE/on-call revisar incidentes antigos.
 */
const COMPLETED_RETENTION_DAYS = 30 as const;
const DEAD_RETENTION_DAYS = 90 as const;

/**
 * Limite de alerta. Uma execucao saudavel nunca deveria ultrapassar isto
 * — se passar, algo upstream esta gerando eventos demais.
 */
const ALERT_THRESHOLD_ROWS = 100_000 as const;

interface CleanupResult {
  completedDeleted: number;
  deadDeleted: number;
  totalDeleted: number;
  durationMs: number;
}

@Injectable()
export class TaskOutboxCleanupService {
  private readonly logger = new Logger(TaskOutboxCleanupService.name);

  constructor(private readonly repository: TaskOutboxRepository) {}

  /**
   * Cron semanal — domingo 03:00.
   *   minuto=0 hora=3 dom-do-mes=* mes=* dia-da-semana=0 (domingo)
   */
  @Cron('0 3 * * 0', {
    name: 'task-outbox-cleanup-weekly',
  })
  async handleWeeklyCleanup(): Promise<void> {
    try {
      await this.runCleanup();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error({
        message: 'task-outbox cleanup failed',
        error: msg,
      });
      // NAO relanca — swallowing e proposital para nao marcar o job como
      // "crashed" no scheduler. Proxima janela (7 dias) tenta de novo.
    }
  }

  /**
   * Execucao idempotente do cleanup. Pode ser chamada manualmente fora do
   * cron (scripts de manutencao, testes).
   */
  async runCleanup(): Promise<CleanupResult> {
    const startedAt = Date.now();

    // Persistencia delegada ao repository (Bravy regra 2 + 6: service nao
    // toca Prisma direto). COMPLETED usa `processed_at`; DEAD usa `created_at`.
    const completedDeleted = await this.repository.deleteCompletedOlderThanDays(
      COMPLETED_RETENTION_DAYS,
    );
    const deadDeleted = await this.repository.deleteDeadOlderThanDays(
      DEAD_RETENTION_DAYS,
    );

    const totalDeleted = completedDeleted + deadDeleted;
    const durationMs = Date.now() - startedAt;

    const result: CleanupResult = {
      completedDeleted,
      deadDeleted,
      totalDeleted,
      durationMs,
    };

    this.logger.log({
      message: 'task-outbox cleanup completed',
      ...result,
    });

    if (totalDeleted > ALERT_THRESHOLD_ROWS) {
      this.logger.error({
        message: 'task-outbox cleanup alert: row count exceeds threshold',
        threshold: ALERT_THRESHOLD_ROWS,
        ...result,
      });
    }

    return result;
  }
}
