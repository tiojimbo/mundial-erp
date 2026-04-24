/**
 * KommoMessagesRepository
 *
 * Encapsula acesso Prisma ao model `KommoMessage`. Unique
 * `(workspaceId, kommoMessageId)` garante idempotencia: mesmo
 * `kommoMessageId` chegando 2x (retry webhook, backfill sobreposto)
 * converge na mesma row — write-once (principio #3).
 *
 * PII handling (principio #9):
 *   - Repository NAO computa preview/hash. Service faz.
 *   - Repository apenas persiste o que receber. Garante separacao clara
 *     de responsabilidades e facilita re-calculo em caso de mudanca de
 *     politica (ex: aumentar preview de 200 p/ 300 chars).
 *
 * @see ../../../prisma/schema.prisma linhas 2654-2677 (model KommoMessage)
 * @see .claude/skills/squad-kommo.mdc principios #1, #3, #6, #9
 */

import { Injectable } from '@nestjs/common';
import { KommoMessage, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

/**
 * Fields de escrita. `contentPreview` ja truncado e `contentHash` ja
 * computado pelo service (principio #9 — separacao de responsabilidade).
 */
export interface MessageWriteFields {
  direction: Prisma.KommoMessageCreateInput['direction'];
  authorAgentId?: string | null;
  /** Ja truncado a 200 chars pelo service. */
  contentPreview: string;
  /** SHA-256 hex (64 chars) do raw content. Computado pelo service. */
  contentHash: string;
  createdAt?: Date;
}

@Injectable()
export class KommoMessagesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByWorkspaceAndMessageId(
    workspaceId: string,
    kommoMessageId: string,
  ): Promise<KommoMessage | null> {
    return this.prisma.kommoMessage.findFirst({
      where: { workspaceId, kommoMessageId, deletedAt: null },
    });
  }

  /**
   * Upsert idempotente por `(workspaceId, kommoMessageId)`. Write-once.
   *
   * Observacao: em mensagens, update raramente muda `contentPreview`/hash
   * (Kommo nao edita mensagem historica), mas pode acontecer de
   * `authorAgentId` chegar preenchido num retry posterior que estava null
   * no primeiro evento. Portanto `update` atualiza apenas fields
   * explicitamente fornecidos no input (conditional assignment).
   */
  async upsertByWorkspaceAndMessageId(
    workspaceId: string,
    kommoMessageId: string,
    accountId: string,
    conversationId: string,
    fields: MessageWriteFields,
    tx?: Prisma.TransactionClient,
  ): Promise<KommoMessage> {
    const client = tx ?? this.prisma;

    const createData: Prisma.KommoMessageCreateInput = {
      workspaceId,
      kommoMessageId,
      account: { connect: { id: accountId } },
      conversation: { connect: { id: conversationId } },
      direction: fields.direction,
      authorAgentId: fields.authorAgentId ?? null,
      contentPreview: fields.contentPreview,
      contentHash: fields.contentHash,
      ...(fields.createdAt !== undefined ? { createdAt: fields.createdAt } : {}),
    };

    const updateData: Prisma.KommoMessageUpdateInput = {};
    if (fields.authorAgentId !== undefined)
      updateData.authorAgentId = fields.authorAgentId;
    // contentPreview/contentHash sao write-once na pratica; permitimos
    // override apenas se o caller explicitamente enviou algo diferente.
    // Caso comum: nao sobrescrever.

    return client.kommoMessage.upsert({
      where: {
        workspaceId_kommoMessageId: { workspaceId, kommoMessageId },
      },
      create: createData,
      update: updateData,
    });
  }

  async softDelete(workspaceId: string, id: string): Promise<void> {
    await this.prisma.kommoMessage.updateMany({
      where: { id, workspaceId, deletedAt: null },
      data: { deletedAt: new Date() },
    });
  }
}
