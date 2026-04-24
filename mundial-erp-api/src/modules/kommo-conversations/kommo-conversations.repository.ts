/**
 * KommoConversationsRepository
 *
 * Encapsula acesso Prisma ao model `KommoConversation`. Unique em
 * `(workspaceId, kommoChatId)` garante idempotencia natural: chegar o mesmo
 * chat duas vezes (retry webhook, backfill sobreposto) converge na mesma
 * row (principio #3 — idempotencia via unique).
 *
 * @see ../../../prisma/schema.prisma linhas 2626-2652 (model KommoConversation)
 * @see .claude/skills/squad-kommo.mdc principios #1, #3, #6
 */

import { Injectable } from '@nestjs/common';
import { KommoConversation, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

/**
 * Fields que o caller pode atualizar/criar. `workspaceId`, `kommoChatId`
 * e `accountId` sao passados como parametros posicionais (unique +
 * required); o restante via este objeto.
 */
export interface ConversationWriteFields {
  leadId?: string | null;
  responsibleAgentId?: string | null;
  departmentId?: string | null;
  status?: Prisma.KommoConversationCreateInput['status'];
  firstMessageAt?: Date | null;
  firstResponseAt?: Date | null;
  resolvedAt?: Date | null;
  lastMessageAt?: Date | null;
}

@Injectable()
export class KommoConversationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Lookup por chave natural do Kommo. `workspaceId` primeiro (principio #1).
   */
  async findByWorkspaceAndChatId(
    workspaceId: string,
    kommoChatId: bigint,
  ): Promise<KommoConversation | null> {
    return this.prisma.kommoConversation.findFirst({
      where: { workspaceId, kommoChatId, deletedAt: null },
    });
  }

  /**
   * Upsert idempotente. Caller passa `accountId` explicitamente para
   * preservar a FK valida (repository nao inventa). Lookup do
   * `accountId` e responsabilidade do service (via
   * `KommoAccountsRepository.findByWorkspaceId`).
   *
   * ACEITA `tx` opcional — quando chamado de dentro de `$transaction` do
   * handler (Mateus), o write precisa acontecer na mesma transacao do
   * update de `KommoMetricSnapshot` e do emit de outbox. Quando chamado
   * fora de tx, usa `this.prisma` direto.
   */
  async upsertByWorkspaceAndChatId(
    workspaceId: string,
    kommoChatId: bigint,
    accountId: string,
    fields: ConversationWriteFields,
    tx?: Prisma.TransactionClient,
  ): Promise<KommoConversation> {
    const client = tx ?? this.prisma;

    const createData: Prisma.KommoConversationCreateInput = {
      workspaceId,
      kommoChatId,
      account: { connect: { id: accountId } },
      leadId: fields.leadId ?? null,
      responsibleAgentId: fields.responsibleAgentId ?? null,
      departmentId: fields.departmentId ?? null,
      status: fields.status,
      firstMessageAt: fields.firstMessageAt ?? null,
      firstResponseAt: fields.firstResponseAt ?? null,
      resolvedAt: fields.resolvedAt ?? null,
      lastMessageAt: fields.lastMessageAt ?? null,
    };

    // Update so envia os fields que vieram — nao sobrescreve com undefined
    // (Prisma interpreta undefined como "nao mude"; explicito null = setar
    // null). Montamos update conditional.
    const updateData: Prisma.KommoConversationUpdateInput = {};
    if (fields.leadId !== undefined) updateData.leadId = fields.leadId;
    if (fields.responsibleAgentId !== undefined)
      updateData.responsibleAgentId = fields.responsibleAgentId;
    if (fields.departmentId !== undefined)
      updateData.departmentId = fields.departmentId;
    if (fields.status !== undefined) updateData.status = fields.status;
    if (fields.firstMessageAt !== undefined)
      updateData.firstMessageAt = fields.firstMessageAt;
    if (fields.firstResponseAt !== undefined)
      updateData.firstResponseAt = fields.firstResponseAt;
    if (fields.resolvedAt !== undefined)
      updateData.resolvedAt = fields.resolvedAt;
    if (fields.lastMessageAt !== undefined)
      updateData.lastMessageAt = fields.lastMessageAt;

    return client.kommoConversation.upsert({
      where: {
        workspaceId_kommoChatId: { workspaceId, kommoChatId },
      },
      create: createData,
      update: updateData,
    });
  }

  /**
   * Soft delete. Idempotente via `updateMany + deletedAt: null`.
   */
  async softDelete(workspaceId: string, id: string): Promise<void> {
    await this.prisma.kommoConversation.updateMany({
      where: { id, workspaceId, deletedAt: null },
      data: { deletedAt: new Date() },
    });
  }
}
