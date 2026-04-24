/**
 * Unit tests — IncomingChatMessageHandler (Sprint 1 K1-7)
 *
 * Focus: validar o contrato do handler ponta-a-ponta com mocks dos 3 services
 * externos (Larissa: conversations + messages, Rafael: webhook events repo).
 *
 * Cobertura:
 *   - happy path: payload válido roda upsert conversation, upsert message,
 *     markProcessed, e loga sem vazar content/phone/email.
 *   - shape inválido: cada campo obrigatório ausente lança BadRequestException.
 *   - KommoAccount ausente para o workspace: lança NotFoundException.
 *   - Privacidade: logger.log NUNCA recebe `content` em full (squad-kommo #18).
 */

import { BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../../database/prisma.service';
import {
  IncomingChatMessageHandler,
  type HandlerInput,
} from './incoming-chat-message.handler';
import {
  KOMMO_CONVERSATIONS_SERVICE,
  KOMMO_MESSAGES_SERVICE,
  KOMMO_WEBHOOK_EVENTS_REPOSITORY,
  type KommoConversationsService,
  type KommoMessagesService,
  type KommoWebhookEventsRepository,
} from '../kommo-workers.tokens';

interface Mocks {
  readonly prisma: {
    kommoAccount: { findUnique: jest.Mock };
  };
  readonly conversations: jest.Mocked<KommoConversationsService>;
  readonly messages: jest.Mocked<KommoMessagesService>;
  readonly webhookEvents: jest.Mocked<KommoWebhookEventsRepository>;
}

function buildValidInput(
  overrides: Partial<HandlerInput['rawPayload']> = {},
): HandlerInput {
  return {
    webhookEventId: 'wh_event_1',
    workspaceId: 'ws_1',
    eventType: 'incoming_chat_message',
    requestId: 'req_1',
    rawPayload: {
      kommoMessageId: 'kmsg_123',
      kommoChatId: 'kchat_456',
      createdAt: 1700000000,
      content: 'Hello from customer',
      direction: 'in',
      ...overrides,
    },
  };
}

async function buildHandler(): Promise<{
  handler: IncomingChatMessageHandler;
  mocks: Mocks;
}> {
  const prismaMock: Mocks['prisma'] = {
    kommoAccount: {
      findUnique: jest.fn().mockResolvedValue({ id: 'acc_1' }),
    },
  };
  const conversationsMock: jest.Mocked<KommoConversationsService> = {
    upsertFromEvent: jest.fn().mockResolvedValue({ id: 'conv_1' }),
  };
  const messagesMock: jest.Mocked<KommoMessagesService> = {
    upsertFromEvent: jest.fn().mockResolvedValue(undefined),
  };
  const webhookEventsMock: jest.Mocked<KommoWebhookEventsRepository> = {
    markProcessed: jest.fn().mockResolvedValue(undefined),
  };

  const moduleRef: TestingModule = await Test.createTestingModule({
    providers: [
      IncomingChatMessageHandler,
      { provide: PrismaService, useValue: prismaMock },
      { provide: KOMMO_CONVERSATIONS_SERVICE, useValue: conversationsMock },
      { provide: KOMMO_MESSAGES_SERVICE, useValue: messagesMock },
      { provide: KOMMO_WEBHOOK_EVENTS_REPOSITORY, useValue: webhookEventsMock },
    ],
  }).compile();

  const handler = moduleRef.get(IncomingChatMessageHandler);
  return {
    handler,
    mocks: {
      prisma: prismaMock,
      conversations: conversationsMock,
      messages: messagesMock,
      webhookEvents: webhookEventsMock,
    },
  };
}

describe('IncomingChatMessageHandler', () => {
  it('processes a valid incoming_chat_message payload end-to-end', async () => {
    const { handler, mocks } = await buildHandler();

    await handler.handle(buildValidInput());

    expect(mocks.prisma.kommoAccount.findUnique).toHaveBeenCalledWith({
      where: { workspaceId: 'ws_1' },
      select: { id: true },
    });
    expect(mocks.conversations.upsertFromEvent).toHaveBeenCalledWith({
      workspaceId: 'ws_1',
      accountId: 'acc_1',
      kommoChatId: 'kchat_456',
      createdAt: 1700000000,
    });
    expect(mocks.messages.upsertFromEvent).toHaveBeenCalledWith({
      workspaceId: 'ws_1',
      accountId: 'acc_1',
      conversationId: 'conv_1',
      kommoMessageId: 'kmsg_123',
      direction: 'in',
      content: 'Hello from customer',
      createdAt: 1700000000,
    });
    expect(mocks.webhookEvents.markProcessed).toHaveBeenCalledWith(
      'ws_1',
      'wh_event_1',
    );
  });

  it('throws BadRequestException when kommoMessageId is missing', async () => {
    const { handler, mocks } = await buildHandler();

    const input: HandlerInput = {
      webhookEventId: 'wh_event_1',
      workspaceId: 'ws_1',
      eventType: 'incoming_chat_message',
      rawPayload: {
        kommoChatId: 'kchat_456',
        createdAt: 1700000000,
        content: 'Hi',
        direction: 'in',
      },
    };

    await expect(handler.handle(input)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(mocks.conversations.upsertFromEvent).not.toHaveBeenCalled();
    expect(mocks.messages.upsertFromEvent).not.toHaveBeenCalled();
    expect(mocks.webhookEvents.markProcessed).not.toHaveBeenCalled();
  });

  it('throws BadRequestException when kommoChatId is missing', async () => {
    const { handler } = await buildHandler();
    const input = buildValidInput();
    delete (input.rawPayload as Record<string, unknown>).kommoChatId;

    await expect(handler.handle(input)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('throws BadRequestException when createdAt is missing', async () => {
    const { handler } = await buildHandler();
    const input = buildValidInput();
    delete (input.rawPayload as Record<string, unknown>).createdAt;

    await expect(handler.handle(input)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('throws BadRequestException when content is not a string', async () => {
    const { handler } = await buildHandler();
    const input = buildValidInput({ content: 42 });

    await expect(handler.handle(input)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('throws BadRequestException when direction is invalid', async () => {
    const { handler } = await buildHandler();
    const input = buildValidInput({ direction: 'sideways' });

    await expect(handler.handle(input)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('throws NotFoundException when KommoAccount is not found for workspace', async () => {
    const { handler, mocks } = await buildHandler();
    mocks.prisma.kommoAccount.findUnique.mockResolvedValueOnce(null);

    await expect(handler.handle(buildValidInput())).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(mocks.conversations.upsertFromEvent).not.toHaveBeenCalled();
  });

  it('passes full content to messages service (truncation/hash is downstream)', async () => {
    // Handler não trunca nem hasheia — responsabilidade de KommoMessagesService
    // (Larissa, K1-2+). Teste documenta o contrato: full content chega intacto.
    const { handler, mocks } = await buildHandler();
    const longContent = 'a'.repeat(500);
    await handler.handle(buildValidInput({ content: longContent }));

    expect(mocks.messages.upsertFromEvent).toHaveBeenCalledWith(
      expect.objectContaining({ content: longContent }),
    );
  });

  it('does not log content, phone or email in full (privacy #18)', async () => {
    const logSpy = jest
      .spyOn(Logger.prototype, 'log')
      .mockImplementation(() => undefined);

    const { handler } = await buildHandler();
    const sensitiveContent = 'customer phone +5511999999999 and email x@y.com';
    await handler.handle(
      buildValidInput({
        content: sensitiveContent,
        // Campos hipotéticos que Kommo pode incluir — handler não deve repassá-los.
        phone: '+5511999999999',
        email: 'x@y.com',
      }),
    );

    expect(logSpy).toHaveBeenCalled();
    const logged = JSON.stringify(logSpy.mock.calls);
    expect(logged).not.toContain(sensitiveContent);
    expect(logged).not.toContain('+5511999999999');
    expect(logged).not.toContain('x@y.com');

    logSpy.mockRestore();
  });
});
