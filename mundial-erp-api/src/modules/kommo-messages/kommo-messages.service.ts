/**
 * KommoMessagesService
 *
 * Escrita idempotente de `KommoMessage` a partir de eventos de webhook
 * Kommo. Consumido pelos handlers do Mateus dentro da `$transaction`
 * principal que tambem (em Sprint 3) atualizara `KommoMetricSnapshot`
 * (metricKeys `total_messages_today`, `messages_by_agent_7d`,
 * `messages_by_hour_7d` — ver ADR-009) e enfileirara outbox
 * `KOMMO_ENTITY_CHANGED`.
 *
 * PII handling (principio #9):
 *   - `rawContent` (texto completo) e **derivado em memoria** — NUNCA
 *     persistido. So `contentPreview` (truncado 200 chars) e `contentHash`
 *     (SHA-256) vao ao banco.
 *   - Logs NUNCA mencionam `rawContent` nem `contentPreview` integral
 *     (principio #13). Logamos apenas `contentHash`.
 *
 * @see .claude/skills/squad-kommo.mdc principios #3, #9, #13
 * @see .claude/adr/009-kommo-metric-snapshot.md (deltas)
 */

import { createHash } from 'node:crypto';
import { Injectable, Logger } from '@nestjs/common';
import { KommoMessage, KommoMessageDirection, Prisma } from '@prisma/client';
import { KommoMessagesRepository } from './kommo-messages.repository';

const CONTENT_PREVIEW_MAX_CHARS = 200; // principio #9

export interface IncomingMessagePayload {
  /** ID publico do Kommo — string unica por conta. */
  kommoMessageId: string;
  direction: KommoMessageDirection;
  authorAgentId?: string | null;
  /**
   * Conteudo bruto da mensagem. NAO persistido — apenas hashed e truncado.
   * Service remove do log antes de qualquer operacao.
   */
  rawContent: string;
  /** Timestamp da mensagem no Kommo. Default: agora. */
  createdAt?: Date;
}

@Injectable()
export class KommoMessagesService {
  private readonly logger = new Logger(KommoMessagesService.name);

  constructor(private readonly repo: KommoMessagesRepository) {}

  /**
   * Upsert idempotente a partir de evento parseado. Chamado de dentro de
   * `$transaction` do handler do Mateus.
   *
   * Ordem de operacoes:
   *   1. Trunca preview (200 chars).
   *   2. Computa hash SHA-256 do `rawContent`.
   *   3. Upsert via repository (tx).
   *   4. Log sem conteudo (apenas hash + metadados).
   *
   * Idempotencia: `(workspaceId, kommoMessageId)` unique; retry Kommo
   * devolve mesma row. Hash nunca muda (mesmo conteudo -> mesmo hash).
   */
  async upsertFromEvent(
    tx: Prisma.TransactionClient,
    workspaceId: string,
    accountId: string,
    conversationId: string,
    payload: IncomingMessagePayload,
  ): Promise<KommoMessage> {
    const contentPreview = this.truncate(
      payload.rawContent,
      CONTENT_PREVIEW_MAX_CHARS,
    );
    const contentHash = this.hashContent(payload.rawContent);

    const message = await this.repo.upsertByWorkspaceAndMessageId(
      workspaceId,
      payload.kommoMessageId,
      accountId,
      conversationId,
      {
        direction: payload.direction,
        authorAgentId: payload.authorAgentId ?? null,
        contentPreview,
        contentHash,
        createdAt: payload.createdAt,
      },
      tx,
    );

    this.logger.log({
      message: 'kommo-message upserted',
      workspaceId,
      messageId: message.id,
      conversationId,
      direction: message.direction,
      // hash e seguro para log — identifica duplicata/replays sem vazar
      // conteudo. Principio #13.
      contentHash,
      // NAO logamos contentPreview — ainda contem PII potencial.
    });

    // TODO(K3-1a): emit outbox KOMMO_ENTITY_CHANGED aqui (mesma tx),
    // apos `KommoOutboxService` existir. Ver ADR-007 secao 4.1 — outbox
    // generico nao e reutilizavel na MVP; precisa de modulo dedicado.

    // TODO(K3-3): aplicar deltas em KommoMetricSnapshot
    // (`total_messages_today`, `messages_by_agent_7d`,
    // `messages_by_hour_7d`) dentro desta mesma tx — ver ADR-009 secao 5.

    return message;
  }

  private truncate(value: string, max: number): string {
    if (value.length <= max) return value;
    return value.slice(0, max);
  }

  private hashContent(value: string): string {
    return createHash('sha256').update(value, 'utf8').digest('hex');
  }
}
