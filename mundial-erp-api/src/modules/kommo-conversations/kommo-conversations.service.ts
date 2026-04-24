/**
 * KommoConversationsService
 *
 * Escrita idempotente de `KommoConversation` a partir de eventos de webhook
 * Kommo. Consumido pelos handlers do Mateus dentro da `$transaction` principal
 * que tambem (em Sprint 3) atualizara `KommoMetricSnapshot` e enfileirara
 * evento de outbox `KOMMO_ENTITY_CHANGED` (ADR-007).
 *
 * Contrato com handler (Mateus):
 *   await this.prisma.$transaction(async (tx) => {
 *     const conv = await convService.upsertFromEvent(tx, workspaceId, accountId, payload);
 *     await snapshotService.applyDeltas(tx, workspaceId, eventType, payload); // Sprint 3
 *     await kommoOutbox.enqueue(tx, { entity: 'conversation', ... });          // Sprint 3
 *   });
 *
 * Princípios atendidos:
 *   - #1 workspaceId sempre primeiro nas queries (via repository)
 *   - #3 idempotencia via unique (workspaceId, kommoChatId)
 *   - #13 logs sem PII: nao logamos lead info nem chat content
 *
 * ==========================================================================
 * TODO (K3-1a, Sprint 3) — emit outbox KOMMO_ENTITY_CHANGED
 * ==========================================================================
 * Nao emitimos outbox nesta rodada. Motivos:
 *   1. `TaskOutboxService` tem `EVENT_TYPE_SET` restrito a 29 eventos de
 *      Task; `KOMMO_ENTITY_CHANGED` e rejeitado (lancaria Error em runtime).
 *   2. ADR-007 explicitamente rejeita generalizar `task-outbox` na MVP
 *      (secao 4.1) — deve existir `kommo-outbox/` dedicado.
 *   3. `kommo_outbox_events` precisa de migration propria (Sprint 2,
 *      `kommo_foundations_2`) + `KommoOutboxService` + worker consumer em
 *      squad-dashboards.
 *
 * Handler do Mateus vai orquestrar `upsertFromEvent` + (Sprint 3) emit do
 * outbox na mesma tx. Este service declara a interface mas deixa o emit
 * para o proximo handshake com squad-infra/squad-dashboards.
 * ==========================================================================
 */

import { Injectable, Logger } from '@nestjs/common';
import {
  KommoConversation,
  KommoConversationStatus,
  Prisma,
} from '@prisma/client';
import {
  ConversationWriteFields,
  KommoConversationsRepository,
} from './kommo-conversations.repository';

/**
 * Payload intermediario pos-parse. Handler do Mateus extrai dos varios
 * tipos de evento Kommo (`chat_resolved`, `message_created`, etc.) para
 * esta shape comum.
 *
 * `kommoChatId` e BigInt porque o Kommo envia IDs de chat que podem
 * exceder `Number.MAX_SAFE_INTEGER` em accounts enterprise. Schema usa
 * `BigInt`; BigInt trafega em toda a camada.
 */
export interface IncomingConversationPayload {
  kommoChatId: bigint;
  /** IDs Kommo-nativos — FKs para models da Sprint 2 (string, nullable). */
  leadId?: string | null;
  responsibleAgentId?: string | null;
  departmentId?: string | null;
  /** Se o evento implica transicao de status — undefined = nao muda. */
  status?: KommoConversationStatus;
  firstMessageAt?: Date | null;
  firstResponseAt?: Date | null;
  resolvedAt?: Date | null;
  lastMessageAt?: Date | null;
}

@Injectable()
export class KommoConversationsService {
  private readonly logger = new Logger(KommoConversationsService.name);

  constructor(private readonly repo: KommoConversationsRepository) {}

  /**
   * Upsert idempotente a partir de evento parseado. Chamado de dentro de
   * `$transaction` do handler (tx passado explicitamente).
   *
   * Retorna a `KommoConversation` resultante para o handler poder
   * referenciar em operacoes subsequentes da mesma tx (ex: `KommoMessage.conversationId`).
   *
   * Idempotencia: 2 chamadas com mesmo `kommoChatId` resultam em 1 row;
   * o segundo call atualiza apenas os fields fornecidos (undefined = nao
   * mexer — respeita idempotencia de leitura-escrita parcial).
   */
  async upsertFromEvent(
    tx: Prisma.TransactionClient,
    workspaceId: string,
    accountId: string,
    payload: IncomingConversationPayload,
  ): Promise<KommoConversation> {
    const fields: ConversationWriteFields = {
      leadId: payload.leadId,
      responsibleAgentId: payload.responsibleAgentId,
      departmentId: payload.departmentId,
      status: payload.status,
      firstMessageAt: payload.firstMessageAt,
      firstResponseAt: payload.firstResponseAt,
      resolvedAt: payload.resolvedAt,
      lastMessageAt: payload.lastMessageAt,
    };

    const conversation = await this.repo.upsertByWorkspaceAndChatId(
      workspaceId,
      payload.kommoChatId,
      accountId,
      fields,
      tx,
    );

    this.logger.log({
      message: 'kommo-conversation upserted',
      workspaceId,
      conversationId: conversation.id,
      // kommoChatId e identificador natural nao-sensivel; seguro para log.
      kommoChatId: payload.kommoChatId.toString(),
      status: conversation.status,
    });

    // TODO(K3-1a): emit outbox KOMMO_ENTITY_CHANGED aqui (mesma tx),
    // apos `KommoOutboxService` existir.

    return conversation;
  }

  /**
   * Lookup sem tx — leitura para handlers/adapters.
   */
  async findByWorkspaceAndChatId(
    workspaceId: string,
    kommoChatId: bigint,
  ): Promise<KommoConversation | null> {
    return this.repo.findByWorkspaceAndChatId(workspaceId, kommoChatId);
  }
}
