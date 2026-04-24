/**
 * KommoAccountsRepository
 *
 * Encapsula acesso Prisma ao model `KommoAccount` (squad-kommo principio #6).
 * Todas as queries filtram por `workspaceId` na primeira clausula (principio #1).
 *
 * Escopo desta rodada (Sprint 1 Etapa 1): APENAS repository. O
 * `KommoAccountsService` e o `KommoAccountsController` sao entregues por
 * Rafael Quintella no mesmo modulo; este arquivo e importado por ambos.
 *
 * @see ../../../prisma/schema.prisma linhas 2603-2624 (model KommoAccount)
 * @see .claude/skills/squad-kommo.mdc principios #1, #3, #6
 */

import { Injectable } from '@nestjs/common';
import { KommoAccount, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class KommoAccountsRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Retorna a conta Kommo associada ao workspace. `workspaceId` e unique
   * no schema — retorna null se o workspace nao possui integracao ativa.
   * Considera soft-deleted como "sem conta" (deletedAt != null).
   */
  async findByWorkspaceId(workspaceId: string): Promise<KommoAccount | null> {
    return this.prisma.kommoAccount.findFirst({
      where: { workspaceId, deletedAt: null },
    });
  }

  /**
   * Owner check embutido: se o `id` existe mas pertence a outro workspace,
   * retorna null (tratado como "nao encontrado"). Nunca vaza conta de outro
   * tenant (principio #1).
   */
  async findById(
    workspaceId: string,
    id: string,
  ): Promise<KommoAccount | null> {
    return this.prisma.kommoAccount.findFirst({
      where: { id, workspaceId, deletedAt: null },
    });
  }

  /**
   * Upsert pelo `workspaceId` (unique no schema — um workspace tem no maximo
   * uma conta Kommo ativa). Idempotente para o caller de reconexao OAuth.
   *
   * Nao reativa soft-deleted — quem reativa e o service (Rafael), que decide
   * se limpa `deletedAt` ou cria nova linha. Aqui apenas o where padrao casa
   * com o unique.
   */
  async upsertByWorkspaceId(
    workspaceId: string,
    create: Prisma.KommoAccountCreateInput,
    update: Prisma.KommoAccountUpdateInput,
  ): Promise<KommoAccount> {
    return this.prisma.kommoAccount.upsert({
      where: { workspaceId },
      create,
      update,
    });
  }

  /**
   * Soft delete. Idempotente — se ja esta deleted, nao executa o update
   * (updateMany com filtro `deletedAt: null`). Pertencimento ao workspace
   * validado na where.
   */
  async softDelete(workspaceId: string, id: string): Promise<void> {
    await this.prisma.kommoAccount.updateMany({
      where: { id, workspaceId, deletedAt: null },
      data: { deletedAt: new Date() },
    });
  }

  /**
   * Atualiza status (ex: TOKEN_EXPIRED apos falha de refresh; REVOKED apos
   * 401 sustentado). Usado pelo `kommo-api-client` quando detecta token
   * invalido.
   */
  async updateStatus(
    workspaceId: string,
    id: string,
    data: Prisma.KommoAccountUpdateInput,
  ): Promise<KommoAccount | null> {
    const result = await this.prisma.kommoAccount.updateMany({
      where: { id, workspaceId, deletedAt: null },
      data,
    });
    if (result.count === 0) return null;
    return this.findById(workspaceId, id);
  }

  /**
   * Touch `lastSyncAt`. Usado pelo reconciliation cron e pelo backfill.
   */
  async touchLastSyncAt(
    workspaceId: string,
    id: string,
    at: Date,
  ): Promise<void> {
    await this.prisma.kommoAccount.updateMany({
      where: { id, workspaceId, deletedAt: null },
      data: { lastSyncAt: at },
    });
  }
}
