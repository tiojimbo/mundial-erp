/**
 * KommoWebhookEventsService
 *
 * Service de escrita idempotente para `KommoWebhookEvent`. Wrapper sobre
 * `KommoWebhookEventsRepository.upsertByUniqueEventId` com logs estruturados
 * (sem PII — principio #13).
 *
 * Responsabilidade: **persistir** o evento de forma idempotente. BullMQ
 * enqueue NAO e responsabilidade deste service — fica no controller do
 * Rafael, que tem `@InjectQueue(QUEUE_KOMMO_WEBHOOKS)`.
 *
 * Contrato com o caller (Rafael):
 *   - Chama `persistAndClassify(input)`.
 *   - Se retorno `{ deduplicated: true }`, controller responde 200 sem
 *     enfileirar (ADR-005 secao 5).
 *   - Se `{ deduplicated: false }`, controller responde 200 E enfileira
 *     job no BullMQ com `eventId` para o worker consumir.
 *
 * @see .claude/adr/005-kommo-webhook-hmac.md
 * @see .claude/skills/squad-kommo.mdc principios #3, #13
 */

import { Injectable, Logger } from '@nestjs/common';
import { KommoWebhookEventStatus } from '@prisma/client';
import {
  KommoWebhookEventsRepository,
  UpsertWebhookEventInput,
} from './kommo-webhook-events.repository';

export interface PersistWebhookResult {
  eventId: string;
  deduplicated: boolean;
  status: KommoWebhookEventStatus;
}

@Injectable()
export class KommoWebhookEventsService {
  private readonly logger = new Logger(KommoWebhookEventsService.name);

  constructor(private readonly repo: KommoWebhookEventsRepository) {}

  /**
   * Persiste o evento idempotentemente. Retorna `deduplicated: true` se o
   * par `(workspaceId, eventId)` ja existia.
   *
   * **BullMQ enqueue e responsabilidade do caller** — este service NAO
   * enfileira. Ver JSDoc do arquivo.
   *
   * Logs: sem payload, sem signature, sem payloadHash. Apenas
   * `{workspaceId, eventType, eventId (id interno), deduplicated, status}`.
   */
  async persistAndClassify(
    input: UpsertWebhookEventInput,
  ): Promise<PersistWebhookResult> {
    const { event, isNew } = await this.repo.upsertByUniqueEventId(input);

    this.logger.log({
      message: 'kommo-webhook-event persisted',
      workspaceId: input.workspaceId,
      eventType: input.eventType,
      // id interno (cuid) — NAO e o eventId publico do Kommo, seguro
      // para log
      id: event.id,
      deduplicated: !isNew,
      status: event.status,
    });

    return {
      eventId: event.id,
      deduplicated: !isNew,
      status: event.status,
    };
  }

  /**
   * Marca como PROCESSED. Chamado pelo handler do Mateus apos sucesso.
   */
  async markProcessed(workspaceId: string, id: string): Promise<void> {
    await this.repo.markProcessed(workspaceId, id);
    this.logger.log({
      message: 'kommo-webhook-event processed',
      workspaceId,
      id,
    });
  }

  /**
   * Marca como DLQ. Chamado pelo worker apos estourar retries.
   * `errorMessage` e truncado a 1000 chars no repository.
   */
  async markDlq(
    workspaceId: string,
    id: string,
    errorMessage: string,
    retryCount: number,
  ): Promise<void> {
    await this.repo.markDlq(workspaceId, id, errorMessage, retryCount);
    this.logger.warn({
      message: 'kommo-webhook-event dead-letter',
      workspaceId,
      id,
      retryCount,
      errorPreview: errorMessage.slice(0, 200),
    });
  }

  /**
   * Incrementa retryCount. Usado pelo worker antes de re-enqueue.
   */
  async incrementRetry(workspaceId: string, id: string): Promise<void> {
    await this.repo.incrementRetry(workspaceId, id);
  }
}
