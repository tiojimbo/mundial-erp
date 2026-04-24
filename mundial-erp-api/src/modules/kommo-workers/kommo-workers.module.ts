/**
 * KommoWorkersModule (PLANO-KOMMO-DASHBOARD.md §6, Sprint 1 K1-7)
 *
 * Agrupa o processor que consome a fila `kommo-webhooks` e os handlers
 * individuais em handlers/*.handler.ts (um por tipo de evento MVP — ver
 * handlers/README.md).
 *
 * Status (Sprint 1 K1-7):
 *   - `IncomingChatMessageHandler` implementado (evento real ponta-a-ponta).
 *   - Outros 9 handlers MVP ainda em TODO — serão adicionados em Sprint 2 K2-3.
 *
 * Depende de:
 *   - `QueueModule` (BullMQ registrado globalmente; fila `kommo-webhooks`
 *     declarada em queue.constants.ts).
 *   - `PrismaModule` via `PrismaService` — resolver `KommoAccount` por workspace.
 *   - Services da Larissa (K1-2+): `KommoConversationsService`,
 *     `KommoMessagesService` — injetados via tokens em `kommo-workers.tokens.ts`.
 *     TODO(Larissa): substituir providers mock por `KommoMessagesModule` e
 *     `KommoConversationsModule` nos `imports` quando forem mergeados.
 *   - Repository do Rafael (K1-6): `KommoWebhookEventsRepository` — idem,
 *     injeção via token; trocar por import de `KommoWebhooksModule` quando
 *     disponível.
 *
 * Registrar em `app.module.ts` só quando Rafael fizer o wire final (fila +
 * controller webhook + services da Larissa disponíveis). Nesta rodada o
 * módulo existe mas não é importado pelo AppModule ainda — intencional.
 */

import { Module } from '@nestjs/common';
import { KommoEventProcessor } from './kommo-event-processor.worker';
import { IncomingChatMessageHandler } from './handlers/incoming-chat-message.handler';

@Module({
  providers: [KommoEventProcessor, IncomingChatMessageHandler],
  exports: [KommoEventProcessor, IncomingChatMessageHandler],
})
export class KommoWorkersModule {}
