/**
 * Injection tokens + contratos de services externos consumidos pelos handlers
 * Kommo (PLANO-KOMMO-DASHBOARD.md §8.3, Sprint 1 K1-7).
 *
 * TODO(Larissa K1-2+): quando `KommoMessagesModule` / `KommoConversationsModule`
 * forem mergeados expondo os services reais, remover as interfaces locais
 * abaixo e importar diretamente (`import { KommoMessagesService } from
 * '../kommo-messages/kommo-messages.service'`). Por ora mantemos o tipo aqui
 * para o handler/worker compilar em paralelo ao trabalho da Larissa.
 *
 * TODO(Rafael K1-6): idem para `KommoWebhookEventsRepository` — deve vir de
 * `../kommo-webhooks/kommo-webhook-events.repository`.
 *
 * Os tokens (`KOMMO_*_SERVICE`) permitem que os specs usem mocks e que o
 * DI troque a implementação sem alterar handler.
 */

export const KOMMO_CONVERSATIONS_SERVICE = Symbol('KOMMO_CONVERSATIONS_SERVICE');
export const KOMMO_MESSAGES_SERVICE = Symbol('KOMMO_MESSAGES_SERVICE');
export const KOMMO_WEBHOOK_EVENTS_REPOSITORY = Symbol(
  'KOMMO_WEBHOOK_EVENTS_REPOSITORY',
);

/**
 * Contrato mínimo exigido pelo `IncomingChatMessageHandler` do service da
 * Larissa (K1-2+). `upsertFromEvent` deve ser idempotente por
 * `[workspaceId, kommoChatId]` e retornar pelo menos o `id` da conversation.
 */
export interface KommoConversationUpsertInput {
  readonly workspaceId: string;
  readonly accountId: string;
  readonly kommoChatId: string;
  readonly createdAt: string | number;
}

export interface KommoConversationUpsertResult {
  readonly id: string;
}

export interface KommoConversationsService {
  upsertFromEvent(
    input: KommoConversationUpsertInput,
  ): Promise<KommoConversationUpsertResult>;
}

/**
 * Contrato do service de messages. Internamente deve:
 *   - truncar `content` a 200 chars em `contentPreview`
 *   - calcular `contentHash` (SHA-256 do full content)
 *   - upsert idempotente por `[workspaceId, kommoMessageId]`
 *   - emitir outbox `KOMMO_ENTITY_CHANGED` em `$transaction` com o upsert
 */
export interface KommoMessageUpsertInput {
  readonly workspaceId: string;
  readonly accountId: string;
  readonly conversationId: string;
  readonly kommoMessageId: string;
  readonly direction: 'in' | 'out';
  readonly content: string;
  readonly createdAt: string | number;
}

export interface KommoMessagesService {
  upsertFromEvent(input: KommoMessageUpsertInput): Promise<void>;
}

/**
 * Contrato mínimo do repositório do ledger `KommoWebhookEvent` (Rafael K1-6).
 * `markProcessed` transiciona RECEIVED|RETRYING -> PROCESSED e é no-op
 * idempotente se já PROCESSED (princípio #3).
 *
 * Assinatura: `(workspaceId, webhookEventId)` — workspaceId SEMPRE primeiro
 * (princípio #1), alinhado com a implementação real de Larissa em
 * `../kommo-webhooks/kommo-webhook-events.repository.ts`.
 */
export interface KommoWebhookEventsRepository {
  markProcessed(workspaceId: string, webhookEventId: string): Promise<void>;
}
