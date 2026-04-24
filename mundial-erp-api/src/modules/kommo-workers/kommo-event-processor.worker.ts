/**
 * KommoEventProcessor (PLANO-KOMMO-DASHBOARD.md §6, §8.3, Sprint 1 K1-7)
 *
 * BullMQ processor que consome a fila `kommo-webhooks`. Para cada job:
 *   1. Medir tempo desde recebimento (perf budget #15 — p95 < 500ms).
 *   2. Despachar para o handler registrado via switch em `eventType`.
 *   3. Em caso de tipo não registrado: logar warning e marcar PROCESSED para
 *      destravar o ledger — reconciliação diária (Sprint 3 K3-5) valida.
 *   4. Erros propagam para BullMQ — política de retry/DLQ é do Rafael (K1-6).
 *
 * Decisão: `Opção A` (single `process()` com switch por eventType).
 *   - Robusta: não depende de `queue.add('incoming_chat_message', ...)` do
 *     Rafael usar o nome do eventType como job name; o worker lê do payload.
 *   - Extensível: adicionar handlers em Sprint 2 é só um case a mais.
 *
 * Observabilidade (squad-kommo #13 e #15):
 *   - `Logger` estruturado com { requestId, workspaceId, webhookEventId,
 *     eventType, durationMs } — SEM content/phone/email (#18).
 *   - Duração sempre medida, mesmo em erro.
 */

import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_KOMMO_WEBHOOKS } from '../queue/queue.constants';
import {
  IncomingChatMessageHandler,
  type HandlerInput,
} from './handlers/incoming-chat-message.handler';
import {
  KOMMO_WEBHOOK_EVENTS_REPOSITORY,
  type KommoWebhookEventsRepository,
} from './kommo-workers.tokens';

/**
 * Payload do job enfileirado pelo `KommoWebhooksService` (Rafael, K1-6).
 * Contrato estável com `HandlerInput` — o worker repassa `job.data` direto.
 */
export type KommoWebhookJobData = HandlerInput;

@Processor(QUEUE_KOMMO_WEBHOOKS)
@Injectable()
export class KommoEventProcessor extends WorkerHost {
  private readonly logger = new Logger(KommoEventProcessor.name);

  constructor(
    private readonly incomingChatMessageHandler: IncomingChatMessageHandler,
    @Inject(KOMMO_WEBHOOK_EVENTS_REPOSITORY)
    private readonly webhookEventsRepository: KommoWebhookEventsRepository,
  ) {
    super();
  }

  async process(job: Job<KommoWebhookJobData>): Promise<void> {
    const { eventType, webhookEventId, workspaceId, requestId } = job.data;
    const startedAt = Date.now();

    try {
      switch (eventType) {
        case 'incoming_chat_message':
          await this.incomingChatMessageHandler.handle(job.data);
          break;
        // TODO(Sprint 2 K2-3): outgoing_chat_message, chat_created,
        //   chat_resolved, chat_responsible_changed, lead_created,
        //   lead_updated, lead_status_changed, lead_responsible_changed,
        //   note_added. Handlers em handlers/*.handler.ts (ver README.md).
        default:
          this.logger.warn({
            message: 'Unhandled event type — marking PROCESSED (skipped)',
            eventType,
            webhookEventId,
            workspaceId,
            requestId,
          });
          // Destravar o ledger. Reconciliação daily (K3-5) valida que nenhum
          // evento relevante foi pulado — se tipo virar relevante depois,
          // backfill preenche a lacuna.
          await this.webhookEventsRepository.markProcessed(
            workspaceId,
            webhookEventId,
          );
      }

      this.logger.log({
        message: 'kommo-webhook job processed',
        jobId: job.id,
        eventType,
        webhookEventId,
        workspaceId,
        requestId,
        durationMs: Date.now() - startedAt,
      });
    } catch (err) {
      this.logger.error({
        message: 'kommo-webhook job failed',
        jobId: job.id,
        eventType,
        webhookEventId,
        workspaceId,
        requestId,
        durationMs: Date.now() - startedAt,
        error: err instanceof Error ? err.message : String(err),
      });
      // Relança para BullMQ aplicar retry/DLQ conforme policy do Rafael (K1-6).
      throw err;
    }
  }
}
