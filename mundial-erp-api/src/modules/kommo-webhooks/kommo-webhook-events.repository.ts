/**
 * KommoWebhookEventsRepository
 *
 * Encapsula acesso Prisma ao model `KommoWebhookEvent`. Este model e
 * operacional (hard delete via purge cron — nao tem `deletedAt`).
 *
 * Idempotencia: o par `(workspaceId, eventId)` e unique. O metodo central
 * `upsertByUniqueEventId` garante que retries do Kommo (mesmo `eventId`
 * chegando 2x) sao deduplicados — web service retorna 200 sem reprocessar
 * (ADR-005 secao 5).
 *
 * Escopo desta rodada: APENAS repository. Service `kommo-webhooks.service.ts`
 * (Rafael) importa este repo. `KommoWebhookEventsService` (abaixo em
 * arquivo separado) e o wrapper idempotente que este repo habilita.
 *
 * @see ../../../prisma/schema.prisma linhas 2680-2697 (model KommoWebhookEvent)
 * @see .claude/adr/005-kommo-webhook-hmac.md secao 5 (replay protection)
 * @see .claude/skills/squad-kommo.mdc principios #1, #3
 */

import { Injectable, Logger } from '@nestjs/common';
import { KommoWebhookEvent, KommoWebhookEventStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

export interface UpsertWebhookEventInput {
  workspaceId: string;
  eventId: string;
  eventType: string;
  payloadHash: string;
  signature: string;
  status?: KommoWebhookEventStatus;
}

export interface UpsertWebhookEventResult {
  event: KommoWebhookEvent;
  /**
   * `true` se a linha foi criada nesta chamada.
   * `false` se ja existia (duplicate — retry do Kommo). Caller usa este flag
   * para responder 200 `{ deduplicated: true }` sem enfileirar novo job
   * BullMQ (ADR-005 secao 5).
   */
  isNew: boolean;
}

@Injectable()
export class KommoWebhookEventsRepository {
  private readonly logger = new Logger(KommoWebhookEventsRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Insert idempotente por `(workspaceId, eventId)`.
   *
   * Estrategia: tenta `create` direto. Se catch em `P2002` (unique violation),
   * consulta a linha existente e retorna `isNew: false`. Simples, um round
   * trip no happy path.
   *
   * Nao logamos `payloadHash` nem `signature` em warn/info (principio #13 —
   * logs sem PII e sem secrets). Debug-level e OK se `LOG_LEVEL=debug`.
   */
  async upsertByUniqueEventId(
    input: UpsertWebhookEventInput,
  ): Promise<UpsertWebhookEventResult> {
    try {
      const created = await this.prisma.kommoWebhookEvent.create({
        data: {
          workspaceId: input.workspaceId,
          eventId: input.eventId,
          eventType: input.eventType,
          payloadHash: input.payloadHash,
          signature: input.signature,
          status: input.status ?? KommoWebhookEventStatus.RECEIVED,
        },
      });
      return { event: created, isNew: true };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        // Duplicate — busca a linha existente pelo unique composto.
        const existing = await this.prisma.kommoWebhookEvent.findUnique({
          where: {
            workspaceId_eventId: {
              workspaceId: input.workspaceId,
              eventId: input.eventId,
            },
          },
        });
        if (!existing) {
          // Race raro: P2002 lanca mas a linha foi deletada entre create e
          // find. Loga warn (sem PII) e repropaga para o caller tratar como
          // erro transient (retry do Kommo vai cair aqui de novo e funcionar).
          this.logger.warn({
            message: 'kommo-webhook-events: P2002 sem linha persistida',
            workspaceId: input.workspaceId,
            eventType: input.eventType,
          });
          throw error;
        }
        return { event: existing, isNew: false };
      }
      throw error;
    }
  }

  /**
   * Marca evento como PROCESSED apos handler concluir com sucesso. Worker
   * chama esse metodo dentro da `$transaction` principal.
   */
  async markProcessed(workspaceId: string, id: string): Promise<void> {
    await this.prisma.kommoWebhookEvent.updateMany({
      where: { id, workspaceId },
      data: {
        status: KommoWebhookEventStatus.PROCESSED,
        processedAt: new Date(),
      },
    });
  }

  /**
   * Dead-letter. Chamado pelo worker apos estourar `MAX_ATTEMPTS` (ADR-003).
   * Conserva `errorMessage` truncado para auditoria.
   */
  async markDlq(
    workspaceId: string,
    id: string,
    errorMessage: string,
    retryCount: number,
  ): Promise<void> {
    await this.prisma.kommoWebhookEvent.updateMany({
      where: { id, workspaceId },
      data: {
        status: KommoWebhookEventStatus.DLQ,
        errorMessage: errorMessage.slice(0, 1000),
        retryCount,
      },
    });
  }

  /**
   * Marca como DEDUPLICATED. Chamado pelo service quando deteta retry
   * Kommo e quer preservar historico do evento duplicado (em vez de
   * reaproveitar a row original).
   *
   * NAO e o caminho padrao — o padrao e reusar a linha original via
   * `isNew: false`. Este metodo existe para cenarios onde o producer quer
   * rastrear cada tentativa separadamente (ex: debug de storm). Nao usado
   * nesta rodada; declarado para completude da interface.
   */
  async markDeduplicated(workspaceId: string, id: string): Promise<void> {
    await this.prisma.kommoWebhookEvent.updateMany({
      where: { id, workspaceId },
      data: { status: KommoWebhookEventStatus.DEDUPLICATED },
    });
  }

  /**
   * Lista eventos recentes do workspace para reconciliacao (ADR-008).
   * Ordenado por `receivedAt` desc. Usado por cron e por view admin.
   *
   * Nao usado nesta rodada mas declarado para evitar add incremental em
   * Sprints futuros.
   */
  async findRecentByWorkspace(
    workspaceId: string,
    since: Date,
    limit: number,
  ): Promise<KommoWebhookEvent[]> {
    return this.prisma.kommoWebhookEvent.findMany({
      where: { workspaceId, receivedAt: { gte: since } },
      orderBy: { receivedAt: 'desc' },
      take: Math.min(limit, 500),
    });
  }

  /**
   * Incrementa retryCount sem mudar status. Usado pelo worker antes de
   * reagendar retry no BullMQ.
   */
  async incrementRetry(workspaceId: string, id: string): Promise<void> {
    await this.prisma.kommoWebhookEvent.updateMany({
      where: { id, workspaceId },
      data: { retryCount: { increment: 1 } },
    });
  }
}
