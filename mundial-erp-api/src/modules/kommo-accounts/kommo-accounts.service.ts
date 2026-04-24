import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { KommoAccount, KommoAuthType, Prisma } from '@prisma/client';
import { KommoAccountsRepository } from './kommo-accounts.repository';
import { KommoAccountResponseDto } from './dto/kommo-account-response.dto';

/**
 * `KommoAccountsService` — orquestra CRUD minimo da integracao Kommo
 * (ADR-004 §2.1, PLANO §7.1).
 *
 * Regras invariantes:
 *   - Um workspace tem no maximo UMA conta ativa (schema: `workspaceId
 *     @unique`; repository usa upsert by workspace).
 *   - `createFromLongLivedToken` NUNCA preenche `refreshToken` ou
 *     `expiresAt` (ADR-004 invariante P0).
 *   - Tokens / secret nunca sao logados em clear ou truncado (principio
 *     #13 squad-kommo).
 *
 * Logs estruturados: `{ operation, workspaceId, subdomain, accountId?,
 * outcome }`. Nunca expoe `accessToken`/`hmacSecret`.
 *
 * TODO(ADR-006): envelope encryption no repository — Inject de
 * `KommoEncryptionService` acontece em rodada futura; API desta classe
 * nao muda.
 */
@Injectable()
export class KommoAccountsService {
  private readonly logger = new Logger(KommoAccountsService.name);

  constructor(private readonly accountsRepository: KommoAccountsRepository) {}

  /**
   * Cria ou atualiza a conta long-lived do workspace (ADR-004 §2.2).
   *
   * Se ja existe conta (ativa ou soft-deleted), faz upsert: subdomain,
   * accessToken, hmacSecret sao substituidos; `refreshToken`/`expiresAt`
   * zerados; `status` volta a ACTIVE; `deletedAt` limpo.
   */
  async createFromLongLivedToken(input: {
    workspaceId: string;
    subdomain: string;
    accessToken: string;
    hmacSecret: string;
    connectedByUserId?: string;
  }): Promise<KommoAccountResponseDto> {
    const {
      workspaceId,
      subdomain,
      accessToken,
      hmacSecret,
      connectedByUserId,
    } = input;

    // Invariante ADR-004: long-lived NUNCA preenche refresh/expires.
    const sharedFields = {
      subdomain,
      authType: KommoAuthType.LONG_LIVED_TOKEN,
      accessToken,
      hmacSecret,
      refreshToken: null,
      expiresAt: null,
      status: 'ACTIVE' as const,
      deletedAt: null,
    };

    const createInput: Prisma.KommoAccountCreateInput = {
      ...sharedFields,
      workspace: { connect: { id: workspaceId } },
      ...(connectedByUserId ? { connectedByUserId } : {}),
    };

    const updateInput: Prisma.KommoAccountUpdateInput = {
      ...sharedFields,
      ...(connectedByUserId !== undefined
        ? { connectedByUserId }
        : {}),
    };

    const entity = await this.accountsRepository.upsertByWorkspaceId(
      workspaceId,
      createInput,
      updateInput,
    );

    this.logger.log({
      operation: 'createFromLongLivedToken',
      workspaceId,
      subdomain,
      accountId: entity.id,
      authType: entity.authType,
      outcome: 'success',
    });

    return KommoAccountResponseDto.fromEntity(entity);
  }

  /**
   * Retorna a conta do workspace, ou `null` se nao existe.
   * Usado pelo controller em `GET /kommo/accounts`.
   */
  async findByWorkspaceId(
    workspaceId: string,
  ): Promise<KommoAccountResponseDto | null> {
    const entity = await this.accountsRepository.findByWorkspaceId(workspaceId);
    if (!entity) return null;
    return KommoAccountResponseDto.fromEntity(entity);
  }

  /**
   * Retorna a entidade Prisma raw (inclui tokens/hmacSecret) da conta do
   * workspace. Uso interno — NUNCA serializa via HTTP. Apenas servicos
   * internos (webhook HMAC validator, worker outbound client).
   */
  async findRawByWorkspaceId(
    workspaceId: string,
  ): Promise<KommoAccount | null> {
    return this.accountsRepository.findByWorkspaceId(workspaceId);
  }

  /**
   * Soft delete com owner check. Se `id` nao pertence ao workspace
   * (ou nao existe), lanca 404 — nunca vaza existencia de conta de
   * outro tenant (principio #1 squad-kommo).
   */
  async softDelete(workspaceId: string, id: string): Promise<void> {
    const existing = await this.accountsRepository.findById(workspaceId, id);
    if (!existing) {
      throw new NotFoundException('Kommo account not found');
    }
    await this.accountsRepository.softDelete(workspaceId, id);
    this.logger.log({
      operation: 'softDelete',
      workspaceId,
      accountId: id,
      outcome: 'success',
    });
  }
}
