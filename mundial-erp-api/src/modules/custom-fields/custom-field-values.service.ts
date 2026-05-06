import {
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  UnprocessableEntityException,
} from '@nestjs/common';
import { CustomFieldType, OutboxEventStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CustomFieldDefinitionsRepository } from './custom-field-definitions.repository';
import { CustomFieldValuesRepository } from './custom-field-values.repository';
import { CustomFieldValueResponseDto } from './dtos/custom-field-value-response.dto';
import {
  validateRequiredWhen,
  validateValue,
} from './validators/field-type-dispatch';
import {
  CUSTOM_FIELDS_METRICS,
  type CustomFieldsMetrics,
} from './custom-fields.metrics';

/**
 * Servico de valores de custom fields (GET por task + PATCH upsert).
 *
 * Responsabilidades (PLANO §"Service set-custom-field-value"):
 *   1. Verifica que `taskId` pertence ao workspace via process->department.
 *   2. Verifica visibilidade da definition (builtin OU do workspace atual).
 *   3. Valida valor pelo dispatcher por tipo (validators/).
 *   4. Upsert em CustomFieldValue por unique (workItemId, definitionId).
 *   5. Idempotencia: mesmo valor 2x consecutivos em janela de 5s nao
 *      reemite evento outbox (dedup em memoria por (workItemId, definitionId)).
 *   6. Enfileira evento `CUSTOM_FIELD_VALUE_CHANGED` no outbox dentro da
 *      mesma `$transaction` do upsert (atomicidade — PLANO Regras #1).
 *
 * Outbox: como `CUSTOM_FIELD_VALUE_CHANGED` nao esta em
 * `TASK_OUTBOX_EVENT_TYPES` (depende de novo enum em TaskActivityType, fora
 * do escopo desta sprint), inserimos a row direto via `tx.taskOutboxEvent`.
 * O worker registrara warning de "handler nao implementado" e marcara como
 * COMPLETED — comportamento aceitavel; squad de outbox podera adicionar o
 * handler quando o enum for ampliado.
 */

const OUTBOX_EVENT_CUSTOM_FIELD_VALUE_CHANGED = 'CUSTOM_FIELD_VALUE_CHANGED';

const DEDUP_WINDOW_MS = 5_000;
const DEDUP_MAX_SIZE = 10_000;
const DEDUP_PURGE_INTERVAL_MS = 60_000;

interface DedupCacheEntry {
  signature: string;
  expiresAt: number;
}

@Injectable()
export class CustomFieldValuesService implements OnModuleDestroy {
  private readonly logger = new Logger(CustomFieldValuesService.name);

  /**
   * Cache de dedup em memoria por (workItemId, definitionId).
   * MVP — refinamento para Redis fica para sprint futura (PLANO TTT-011).
   * Cleanup combinado:
   *   - Eviccao oportunistica no SET quando atinge cap (`DEDUP_MAX_SIZE`).
   *   - Timer periodico (`DEDUP_PURGE_INTERVAL_MS`) descarta entradas
   *     expiradas para evitar leak sob carga sustentada.
   * Map em JS itera em insertion order, entao a primeira chave do iterator
   * representa a entrada mais antiga (oldest-first eviction).
   */
  private readonly dedupCache = new Map<string, DedupCacheEntry>();
  private readonly dedupCleanupInterval: NodeJS.Timeout;

  constructor(
    private readonly prisma: PrismaService,
    private readonly definitionsRepo: CustomFieldDefinitionsRepository,
    private readonly valuesRepo: CustomFieldValuesRepository,
    @Inject(CUSTOM_FIELDS_METRICS)
    private readonly metrics: CustomFieldsMetrics,
  ) {
    this.dedupCleanupInterval = setInterval(
      () => this.purgeDedupCache(),
      DEDUP_PURGE_INTERVAL_MS,
    );
    // Permite o processo Node terminar mesmo com o timer agendado (testes,
    // graceful shutdown). `unref` retorna o proprio Timeout em runtimes Node.
    this.dedupCleanupInterval.unref?.();
  }

  onModuleDestroy(): void {
    clearInterval(this.dedupCleanupInterval);
  }

  /**
   * Lista valores de uma task. Visibilidade da definicao filtrada no repo
   * (builtin OR workspace atual). Cross-tenant em task -> 404.
   */
  async listForTask(
    workspaceId: string,
    taskId: string,
  ): Promise<CustomFieldValueResponseDto[]> {
    const task = await this.valuesRepo.findTaskInWorkspace(workspaceId, taskId);
    if (!task) {
      throw new NotFoundException('Tarefa nao encontrada');
    }
    const rows = await this.valuesRepo.findValuesForTask(workspaceId, taskId);
    return rows.map((row) =>
      CustomFieldValueResponseDto.fromEntity(row, {
        exposeWorkspaceId: row.definition.workspaceId === workspaceId,
      }),
    );
  }

  /**
   * Upsert idempotente de valor.
   * Retorna o DTO consolidado pos-escrita.
   */
  async setValue(
    workspaceId: string,
    taskId: string,
    definitionId: string,
    rawValue: unknown,
    actorUserId: string,
  ): Promise<CustomFieldValueResponseDto> {
    // 1. Tenancy da task.
    const task = await this.valuesRepo.findTaskInWorkspace(workspaceId, taskId);
    if (!task) {
      throw new NotFoundException('Tarefa nao encontrada');
    }

    // 2. Visibilidade da definition (builtin OR own).
    const definition = await this.definitionsRepo.findVisibleById(
      workspaceId,
      definitionId,
    );
    if (!definition) {
      throw new NotFoundException('Custom field definition nao encontrada');
    }

    // 3. Builtin com config readOnly=true bloqueia escrita (PLANO seed
    //    `order_number`, `requisition_code` — gerados pelo sistema).
    if (this.isReadOnlyByConfig(definition.config)) {
      throw new ForbiddenException(
        'Custom field marcado como readOnly nao aceita escrita pela API',
      );
    }

    // 4. Dispatch de validacao por tipo.
    const dispatchResult = validateValue(definition.type, rawValue, {
      type: definition.type,
      required: definition.required,
      config: definition.config,
    });
    if (!dispatchResult.valid) {
      throw new UnprocessableEntityException({
        message: dispatchResult.reason ?? 'Valor invalido',
        code: 'CUSTOM_FIELD_VALUE_INVALID',
        definitionId,
        type: definition.type,
      });
    }

    // 5. Calculo das colunas valor (apenas uma preenchida).
    const columns = this.toValueColumns(
      definition.type,
      dispatchResult.normalized,
    );
    const signature = this.signatureOf(columns);

    // 6. Idempotencia: dedup em janela de 5s.
    const cacheKey = `${taskId}:${definitionId}`;
    const cached = this.readDedupCache(cacheKey);
    const isDuplicate = cached?.signature === signature;

    if (isDuplicate) {
      // Sem reescrita, sem novo evento. Retorna o estado atual.
      const current = await this.valuesRepo.findValueByPair(
        taskId,
        definitionId,
      );
      if (!current) {
        // Cache esta inconsistente — segue caminho normal.
        this.dedupCache.delete(cacheKey);
      } else {
        return CustomFieldValueResponseDto.fromEntity(current, {
          exposeWorkspaceId: current.definition.workspaceId === workspaceId,
        });
      }
    }

    // 7. Upsert + outbox em $transaction.
    const persisted = await this.prisma.$transaction(async (tx) => {
      // 7a. `requiredWhen` server-side (PLANO Regra de Negocio #4).
      //     Le os demais custom field values da mesma task (+1 query, budget
      //     total <=5; ainda dentro do orcamento global <=10) e monta um mapa
      //     `definition.key -> valor`. Avalia ANTES do upsert para que uma
      //     violacao aborte a transacao sem efeito colateral.
      const otherFields = await tx.customFieldValue.findMany({
        where: {
          workItemId: taskId,
          definitionId: { not: definitionId },
          definition: { deletedAt: null },
        },
        select: {
          valueText: true,
          valueNumber: true,
          valueDate: true,
          definition: { select: { key: true, type: true } },
        },
      });
      const otherFieldsByKey = new Map<string, unknown>();
      for (const other of otherFields) {
        otherFieldsByKey.set(
          other.definition.key,
          this.extractScalar(other.definition.type, other),
        );
      }

      const requiredWhenResult = validateRequiredWhen(
        { label: definition.label, config: definition.config },
        dispatchResult.normalized ?? null,
        otherFieldsByKey,
      );
      if (!requiredWhenResult.ok) {
        throw new UnprocessableEntityException({
          message: requiredWhenResult.reason ?? 'Campo obrigatorio condicional',
          code: 'CUSTOM_FIELD_REQUIRED_WHEN',
          definitionId,
          type: definition.type,
        });
      }

      const row = await this.valuesRepo.upsertValue(
        {
          workItemId: taskId,
          definitionId,
          valueText: columns.valueText,
          valueNumber: columns.valueNumber,
          valueDate: columns.valueDate,
        },
        tx,
      );

      // Outbox: insert direto na tabela com eventType custom (string column).
      // Sprint pendente para handler dedicado (mapear para WorkItemActivity).
      await tx.taskOutboxEvent.create({
        data: {
          aggregateId: taskId,
          eventType: OUTBOX_EVENT_CUSTOM_FIELD_VALUE_CHANGED,
          status: OutboxEventStatus.PENDING,
          payload: {
            taskId,
            definitionId,
            type: definition.type,
            actorId: actorUserId,
            valueSnapshot: {
              valueText: columns.valueText,
              valueNumber: columns.valueNumber,
              valueDate: columns.valueDate?.toISOString() ?? null,
            },
          } satisfies Prisma.InputJsonValue,
        },
      });

      return row;
    });

    // 8. Atualiza cache de dedup pos-commit.
    this.writeDedupCache(cacheKey, signature);

    // Sprint 5 (TTT-050) — incrementa contador apos commit. Adapter
    // Noop ou Prometheus dependendo de METRICS_TOKEN.
    this.metrics.customFieldsWrittenTotal({
      fieldType: definition.type,
      workspaceId,
    });

    this.logger.log(
      `custom-field-value.set task=${taskId} definition=${definitionId} type=${definition.type} actor=${actorUserId}`,
    );

    return CustomFieldValueResponseDto.fromEntity(persisted, {
      exposeWorkspaceId: persisted.definition.workspaceId === workspaceId,
    });
  }

  // ------------------------------------------------------------------
  // Helpers privados
  // ------------------------------------------------------------------

  private isReadOnlyByConfig(config: unknown): boolean {
    if (
      typeof config !== 'object' ||
      config === null ||
      Array.isArray(config)
    ) {
      return false;
    }
    const readOnly = (config as { readOnly?: unknown }).readOnly;
    return readOnly === true;
  }

  private toValueColumns(
    type: CustomFieldType,
    normalized: unknown,
  ): {
    valueText: string | null;
    valueNumber: number | null;
    valueDate: Date | null;
  } {
    if (normalized === undefined || normalized === null) {
      return { valueText: null, valueNumber: null, valueDate: null };
    }
    switch (type) {
      case CustomFieldType.NUMBER:
      case CustomFieldType.CURRENCY:
        return {
          valueText: null,
          valueNumber: normalized as number,
          valueDate: null,
        };
      case CustomFieldType.DATE:
        return {
          valueText: null,
          valueNumber: null,
          valueDate: normalized as Date,
        };
      default:
        return {
          valueText: String(normalized),
          valueNumber: null,
          valueDate: null,
        };
    }
  }

  private signatureOf(columns: {
    valueText: string | null;
    valueNumber: number | null;
    valueDate: Date | null;
  }): string {
    return JSON.stringify({
      t: columns.valueText,
      n: columns.valueNumber,
      d: columns.valueDate?.toISOString() ?? null,
    });
  }

  private readDedupCache(key: string): DedupCacheEntry | null {
    this.purgeExpired();
    const entry = this.dedupCache.get(key);
    if (!entry) return null;
    if (entry.expiresAt < Date.now()) {
      this.dedupCache.delete(key);
      return null;
    }
    return entry;
  }

  private writeDedupCache(key: string, signature: string): void {
    // Se a chave nao existe e o cache atingiu o cap, remove o oldest antes do
    // set para manter `size <= DEDUP_MAX_SIZE` (LRU oldest-first via Map
    // insertion order). Re-set de chave existente nao infla o tamanho.
    if (!this.dedupCache.has(key) && this.dedupCache.size >= DEDUP_MAX_SIZE) {
      const oldest = this.dedupCache.keys().next().value;
      if (oldest !== undefined) {
        this.dedupCache.delete(oldest);
      }
    }
    this.dedupCache.set(key, {
      signature,
      expiresAt: Date.now() + DEDUP_WINDOW_MS,
    });
  }

  private purgeExpired(): void {
    const now = Date.now();
    // Cap de iteracoes para evitar pause em mapas grandes.
    if (this.dedupCache.size < 64) return;
    for (const [key, entry] of this.dedupCache.entries()) {
      if (entry.expiresAt < now) this.dedupCache.delete(key);
    }
  }

  /**
   * Limpeza periodica disparada por `setInterval` (ver constructor).
   * 1) descarta entradas expiradas;
   * 2) caso ainda exceda o cap apos a limpeza (concorrencia/race), evicciona
   *    em ordem de insercao ate voltar ao cap.
   */
  private purgeDedupCache(): void {
    const now = Date.now();
    for (const [key, entry] of this.dedupCache) {
      if (entry.expiresAt <= now) this.dedupCache.delete(key);
    }
    if (this.dedupCache.size > DEDUP_MAX_SIZE) {
      const overflow = this.dedupCache.size - DEDUP_MAX_SIZE;
      const it = this.dedupCache.keys();
      for (let i = 0; i < overflow; i++) {
        const k = it.next().value;
        if (k === undefined) break;
        this.dedupCache.delete(k);
      }
    }
  }

  /**
   * Extrai o valor escalar relevante de uma row de `CustomFieldValue` para
   * comparacao em `requiredWhen`. Retorna `null` quando todas as colunas
   * estao vazias (estado equivalente a "campo nao preenchido").
   */
  private extractScalar(
    type: CustomFieldType,
    row: {
      valueText: string | null;
      valueNumber: Prisma.Decimal | number | null;
      valueDate: Date | null;
    },
  ): string | number | Date | null {
    switch (type) {
      case CustomFieldType.NUMBER:
      case CustomFieldType.CURRENCY:
        if (row.valueNumber === null || row.valueNumber === undefined) {
          return null;
        }
        return typeof row.valueNumber === 'number'
          ? row.valueNumber
          : Number(row.valueNumber);
      case CustomFieldType.DATE:
        return row.valueDate;
      default:
        return row.valueText;
    }
  }
}
