/**
 * IncomingChatMessageHandler (PLANO-KOMMO-DASHBOARD.md §4.1, §8.3, Sprint 1 K1-7)
 *
 * Handler real ponta-a-ponta do evento `incoming_chat_message`. Fluxo:
 *   1. Valida shape mínimo do `rawPayload` recebido do webhook.
 *   2. Resolve `KommoAccount` do workspace (falha => DLQ via BullMQ).
 *   3. Upsert `KommoConversation` via `KommoConversationsService.upsertFromEvent`
 *      (Larissa — grava conversa + lastMessageAt).
 *   4. Upsert `KommoMessage` via `KommoMessagesService.upsertFromEvent` (Larissa
 *      — trunca `contentPreview` a 200 chars, calcula `contentHash`, emite
 *      outbox `KOMMO_ENTITY_CHANGED` dentro de `$transaction`).
 *   5. Marca `KommoWebhookEvent` como PROCESSED no ledger idempotente.
 *
 * Idempotência (squad-kommo #3): replay do mesmo evento é seguro — todos os
 * upserts são by-key (`kommoMessageId`, `kommoChatId`), e `markProcessed` é
 * no-op se já processado. Se qualquer step falhar, o worker BullMQ retém o
 * job conforme política de retry do Rafael (K1-6); ao esgotar vai p/ DLQ.
 *
 * Privacidade (squad-kommo #18): NUNCA logar `content`, `phone`, `email`
 * em full. Apenas IDs, direção, workspaceId e durationMs.
 *
 * Perf budget (squad-kommo #15): p95 < 500ms. `Date.now()` antes/depois.
 */

import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import {
  type KommoConversationsService,
  type KommoMessagesService,
  type KommoWebhookEventsRepository,
  KOMMO_CONVERSATIONS_SERVICE,
  KOMMO_MESSAGES_SERVICE,
  KOMMO_WEBHOOK_EVENTS_REPOSITORY,
} from '../kommo-workers.tokens';

/**
 * Input do handler — contrato estável com `KommoEventProcessor`.
 * Shape acordado com Rafael (K1-6) para o `job.data` enfileirado pelo
 * controller de webhook.
 */
export interface HandlerInput {
  readonly webhookEventId: string;
  readonly workspaceId: string;
  readonly eventType: string;
  readonly rawPayload: Record<string, unknown>;
  readonly requestId?: string;
}

/**
 * Direções aceitas no shape validado. Kommo usa `"in"` / `"out"` no payload
 * externo — mapeamento para `KommoMessageDirection` (IN/OUT) fica por conta
 * do `KommoMessagesService.upsertFromEvent` da Larissa.
 */
type RawDirection = 'in' | 'out';

/**
 * Shape mínimo exigido do `rawPayload` para `incoming_chat_message`.
 * Validação manual (sem Zod — projeto padroniza class-validator, mas para
 * payload externo webhook a guard manual é mais leve e localizada).
 */
interface ValidatedPayload {
  readonly kommoMessageId: string;
  readonly kommoChatId: string;
  readonly createdAt: string | number;
  readonly content: string;
  readonly direction: RawDirection;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

function isStringOrNumber(value: unknown): value is string | number {
  return typeof value === 'string' || typeof value === 'number';
}

function assertValidPayload(
  payload: Record<string, unknown>,
): ValidatedPayload {
  const { kommoMessageId, kommoChatId, createdAt, content, direction } =
    payload;

  if (!isNonEmptyString(kommoMessageId)) {
    throw new BadRequestException(
      'incoming_chat_message: missing or invalid `kommoMessageId`',
    );
  }
  if (!isNonEmptyString(kommoChatId)) {
    throw new BadRequestException(
      'incoming_chat_message: missing or invalid `kommoChatId`',
    );
  }
  if (!isStringOrNumber(createdAt)) {
    throw new BadRequestException(
      'incoming_chat_message: missing or invalid `createdAt`',
    );
  }
  if (typeof content !== 'string') {
    throw new BadRequestException(
      'incoming_chat_message: missing or invalid `content`',
    );
  }
  if (direction !== 'in' && direction !== 'out') {
    throw new BadRequestException(
      'incoming_chat_message: `direction` must be `in` or `out`',
    );
  }

  return {
    kommoMessageId,
    kommoChatId,
    createdAt,
    content,
    direction,
  };
}

@Injectable()
export class IncomingChatMessageHandler {
  private readonly logger = new Logger(IncomingChatMessageHandler.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(KOMMO_CONVERSATIONS_SERVICE)
    private readonly conversationsService: KommoConversationsService,
    @Inject(KOMMO_MESSAGES_SERVICE)
    private readonly messagesService: KommoMessagesService,
    @Inject(KOMMO_WEBHOOK_EVENTS_REPOSITORY)
    private readonly webhookEventsRepository: KommoWebhookEventsRepository,
  ) {}

  async handle(input: HandlerInput): Promise<void> {
    const { webhookEventId, workspaceId, rawPayload, requestId } = input;
    const startedAt = Date.now();

    // 1. Shape validation — BadRequestException => BullMQ retry; esgotado => DLQ.
    const payload = assertValidPayload(rawPayload);

    // 2. Resolver KommoAccount do workspace (1:1 com workspace — see schema).
    const account = await this.prisma.kommoAccount.findUnique({
      where: { workspaceId },
      select: { id: true },
    });
    if (!account) {
      throw new NotFoundException(
        `KommoAccount not found for workspace ${workspaceId}`,
      );
    }

    // 3. Upsert conversation (idempotente via unique [workspaceId, kommoChatId]).
    const conversation = await this.conversationsService.upsertFromEvent({
      workspaceId,
      accountId: account.id,
      kommoChatId: payload.kommoChatId,
      createdAt: payload.createdAt,
    });

    // 4. Upsert message + outbox emit dentro de $transaction (responsabilidade
    //    da Larissa — aqui só delegamos). Idempotente via unique
    //    [workspaceId, kommoMessageId]. Service trunca content a 200 chars,
    //    calcula hash SHA-256 e emite KOMMO_ENTITY_CHANGED.
    await this.messagesService.upsertFromEvent({
      workspaceId,
      accountId: account.id,
      conversationId: conversation.id,
      kommoMessageId: payload.kommoMessageId,
      direction: payload.direction,
      content: payload.content,
      createdAt: payload.createdAt,
    });

    // 5. Finalizar ledger idempotente. workspaceId primeiro (princípio #1).
    await this.webhookEventsRepository.markProcessed(
      workspaceId,
      webhookEventId,
    );

    // Log estruturado — SEM content/phone/email em full (squad-kommo #18).
    this.logger.log({
      message: 'incoming_chat_message processed',
      requestId,
      workspaceId,
      webhookEventId,
      kommoMessageId: payload.kommoMessageId,
      kommoChatId: payload.kommoChatId,
      conversationId: conversation.id,
      direction: payload.direction,
      durationMs: Date.now() - startedAt,
    });
  }
}
