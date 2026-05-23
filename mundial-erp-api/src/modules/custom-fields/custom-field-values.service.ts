import {
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  Optional,
  UnprocessableEntityException,
} from '@nestjs/common';
import { CustomFieldType, OutboxEventStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CustomFieldDefinitionsRepository } from './custom-field-definitions.repository';
import { CustomFieldValuesRepository } from './custom-field-values.repository';
import { CustomFieldValueResponseDto } from './dtos/custom-field-value-response.dto';
import {
  FieldDispatchResult,
  validateRequiredWhen,
  validateValue,
} from './validators/field-type-dispatch';
import {
  CUSTOM_FIELDS_METRICS,
  type CustomFieldsMetrics,
} from './custom-fields.metrics';
import { TaskEventsPublisher } from '../automations/events/task-events.publisher';

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

interface DerivationRule {
  sourceDefinitionId: string;
  operation: 'multiply' | 'divide';
  factor: number;
}

interface DerivedFieldChange {
  definitionId: string;
  before: number | null;
  after: number | null;
  taskId?: string;
}

interface RollupConfig {
  sourceRelationshipFieldId: string;
  sourceCostFieldId: string;
  operation: 'sumProduct';
}

interface RelationshipItem {
  taskId: string;
  quantity: number;
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
    @Optional()
    private readonly automationEvents?: TaskEventsPublisher,
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
      options: definition.options,
    });
    if (!dispatchResult.valid) {
      throw new UnprocessableEntityException({
        message: dispatchResult.reason ?? 'Valor invalido',
        code: 'CUSTOM_FIELD_VALUE_INVALID',
        definitionId,
        type: definition.type,
      });
    }

    // 4b. Integridade referencial para tipos que apontam pra outras entidades.
    await this.validateReferentialIntegrity(
      workspaceId,
      definition.type,
      dispatchResult,
    );

    // 5. Calculo das colunas valor (apenas uma preenchida).
    const columns = this.toValueColumns(dispatchResult);
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

    // Snapshot do valor anterior para enriquecer o evento de automation.
    // Leitura fora da tx (best-effort) — usada apenas no payload do publisher.
    const previousValueRow = this.automationEvents
      ? await this.valuesRepo.findValueByPair(taskId, definitionId)
      : null;
    const beforeValue = previousValueRow
      ? this.extractScalar(definition.type, previousValueRow)
      : null;

    // 7. Upsert + outbox em $transaction.
    const txResult = await this.prisma.$transaction(async (tx) => {
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
          valueBoolean: true,
          valueJson: true,
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
          valueJson: columns.valueJson,
          valueBoolean: columns.valueBoolean,
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
              valueJson: columns.valueJson,
              valueBoolean: columns.valueBoolean,
            },
          } satisfies Prisma.InputJsonValue,
        },
      });

      // 7b. Recalculo em cascata dos campos derivados (config.derivedFrom).
      const derivedChanges =
        definition.type === CustomFieldType.CURRENCY
          ? await this.recalculateDerived(
              tx,
              taskId,
              definitionId,
              columns.valueNumber,
              workspaceId,
            )
          : [];

      // 7c. Recalculo de ROLLUPs (engine de composicao).
      const rollupChanges: DerivedFieldChange[] = [];
      if (definition.type === CustomFieldType.RELATIONSHIP) {
        rollupChanges.push(
          ...(await this.recalculateRollupsForRelationship(
            tx,
            taskId,
            definitionId,
            workspaceId,
          )),
        );
      }
      if (definition.type === CustomFieldType.CURRENCY) {
        rollupChanges.push(
          ...(await this.recalculateRollupsForCostSource(
            tx,
            taskId,
            definitionId,
            workspaceId,
          )),
        );
      }

      return {
        persisted: row,
        derivedChanges: [...derivedChanges, ...rollupChanges],
      };
    });
    const { persisted, derivedChanges } = txResult;

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

    if (this.automationEvents) {
      const ctx = await this.loadTaskContext(taskId, workspaceId);
      if (ctx) {
        const afterValue = this.extractScalar(definition.type, {
          valueText: columns.valueText,
          valueNumber: columns.valueNumber,
          valueDate: columns.valueDate,
          valueBoolean: columns.valueBoolean,
          valueJson: columns.valueJson as Prisma.JsonValue,
        });
        this.automationEvents.emitCustomFieldChanged({
          workspaceId,
          taskId,
          listId: ctx.listId,
          folderId: ctx.folderId,
          spaceId: ctx.spaceId,
          actorUserId,
          customFieldDefinitionId: definitionId,
          before: beforeValue,
          after: afterValue,
        });
        for (const change of derivedChanges) {
          this.automationEvents.emitCustomFieldChanged({
            workspaceId,
            taskId: change.taskId ?? taskId,
            listId: ctx.listId,
            folderId: ctx.folderId,
            spaceId: ctx.spaceId,
            actorUserId,
            customFieldDefinitionId: change.definitionId,
            before: change.before,
            after: change.after,
          });
        }
      }
    }

    return CustomFieldValueResponseDto.fromEntity(persisted, {
      exposeWorkspaceId: persisted.definition.workspaceId === workspaceId,
    });
  }

  async setValuesBulk(
    workspaceId: string,
    taskId: string,
    items: { definitionId: string; value: unknown }[],
    actorUserId: string,
  ): Promise<{
    updated: CustomFieldValueResponseDto[];
    failed: { definitionId: string; reason: string }[];
  }> {
    const task = await this.valuesRepo.findTaskInWorkspace(workspaceId, taskId);
    if (!task) {
      throw new NotFoundException('Tarefa nao encontrada');
    }
    const updated: CustomFieldValueResponseDto[] = [];
    const failed: { definitionId: string; reason: string }[] = [];
    // Sucesso parcial: um campo invalido nao aborta os demais.
    for (const item of items) {
      try {
        updated.push(
          await this.setValue(
            workspaceId,
            taskId,
            item.definitionId,
            item.value,
            actorUserId,
          ),
        );
      } catch (err) {
        failed.push({
          definitionId: item.definitionId,
          reason: err instanceof Error ? err.message : 'erro desconhecido',
        });
      }
    }
    return { updated, failed };
  }

  async clearValue(
    workspaceId: string,
    taskId: string,
    definitionId: string,
  ): Promise<void> {
    const task = await this.valuesRepo.findTaskInWorkspace(workspaceId, taskId);
    if (!task) {
      throw new NotFoundException('Tarefa nao encontrada');
    }

    const definition = await this.definitionsRepo.findVisibleById(
      workspaceId,
      definitionId,
    );
    if (!definition) {
      throw new NotFoundException('Custom field definition nao encontrada');
    }

    const beforeRow = await this.valuesRepo.findValueByPair(
      taskId,
      definitionId,
    );
    // Idempotente: limpar um campo que ja esta vazio nao e erro.
    if (!beforeRow) {
      return;
    }
    const beforeValue = this.extractScalar(definition.type, beforeRow);

    await this.valuesRepo.deleteValue(taskId, definitionId);

    this.dedupCache.delete(`${taskId}:${definitionId}`);

    this.logger.log(
      `custom-field-value.cleared task=${taskId} def=${definitionId} workspace=${workspaceId}`,
    );

    if (this.automationEvents) {
      const ctx = await this.loadTaskContext(taskId, workspaceId);
      if (ctx) {
        this.automationEvents.emitCustomFieldChanged({
          workspaceId,
          taskId,
          listId: ctx.listId,
          folderId: ctx.folderId,
          spaceId: ctx.spaceId,
          actorUserId: null,
          customFieldDefinitionId: definitionId,
          before: beforeValue,
          after: null,
        });
      }
    }
  }

  private async loadTaskContext(
    taskId: string,
    workspaceId: string,
  ): Promise<{
    listId: string;
    folderId: string | null;
    spaceId: string | null;
  } | null> {
    const row = await this.prisma.workItem.findFirst({
      where: { id: taskId, deletedAt: null, list: { space: { workspaceId } } },
      select: {
        listId: true,
        list: {
          select: {
            folderId: true,
            spaceId: true,
            folder: { select: { spaceId: true } },
          },
        },
      },
    });
    if (!row) return null;
    return {
      listId: row.listId,
      folderId: row.list.folderId ?? null,
      spaceId: row.list.spaceId ?? row.list.folder?.spaceId ?? null,
    };
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

  private toValueColumns(dispatch: FieldDispatchResult): {
    valueText: string | null;
    valueNumber: number | null;
    valueDate: Date | null;
    valueJson: Prisma.InputJsonValue | null;
    valueBoolean: boolean | null;
  } {
    const empty = {
      valueText: null,
      valueNumber: null,
      valueDate: null,
      valueJson: null,
      valueBoolean: null,
    };
    if (
      dispatch.normalized === undefined ||
      dispatch.normalized === null ||
      !dispatch.column
    ) {
      return empty;
    }
    switch (dispatch.column) {
      case 'valueText':
        return { ...empty, valueText: String(dispatch.normalized) };
      case 'valueNumber':
        return { ...empty, valueNumber: dispatch.normalized as number };
      case 'valueDate':
        return { ...empty, valueDate: dispatch.normalized as Date };
      case 'valueBoolean':
        return { ...empty, valueBoolean: dispatch.normalized as boolean };
      case 'valueJson':
        return {
          ...empty,
          valueJson: dispatch.normalized as Prisma.InputJsonValue,
        };
      default: {
        const exhaustive: never = dispatch.column;
        void exhaustive;
        return empty;
      }
    }
  }

  private signatureOf(columns: {
    valueText: string | null;
    valueNumber: number | null;
    valueDate: Date | null;
    valueJson: Prisma.InputJsonValue | null;
    valueBoolean: boolean | null;
  }): string {
    return JSON.stringify({
      t: columns.valueText,
      n: columns.valueNumber,
      d: columns.valueDate?.toISOString() ?? null,
      j: columns.valueJson,
      b: columns.valueBoolean,
    });
  }

  private async validateReferentialIntegrity(
    workspaceId: string,
    type: CustomFieldType,
    dispatch: FieldDispatchResult,
  ): Promise<void> {
    if (!dispatch.valid || dispatch.normalized === undefined) return;

    if (type === CustomFieldType.USER) {
      const userId = dispatch.normalized as string;
      const exists = await this.userBelongsToWorkspace(userId, workspaceId);
      if (!exists) {
        throw new UnprocessableEntityException({
          message: 'USER referenciado nao existe no workspace',
          code: 'CUSTOM_FIELD_REF_NOT_FOUND',
          type,
        });
      }
      return;
    }

    if (type === CustomFieldType.PEOPLE) {
      const ids = dispatch.normalized as string[];
      if (ids.length === 0) return;
      const count = await this.prisma.workspaceMember.count({
        where: { workspaceId, userId: { in: ids } },
      });
      if (count !== ids.length) {
        throw new UnprocessableEntityException({
          message: 'PEOPLE contem userIds que nao pertencem ao workspace',
          code: 'CUSTOM_FIELD_REF_NOT_FOUND',
          type,
        });
      }
      return;
    }

    if (type === CustomFieldType.RELATIONSHIP) {
      const normalized = dispatch.normalized as
        | string[]
        | { items: { taskId: string; quantity: number }[]; taskIds: string[] };
      const ids = Array.isArray(normalized) ? normalized : normalized.taskIds;
      if (ids.length === 0) return;
      const count = await this.prisma.workItem.count({
        where: {
          id: { in: ids },
          deletedAt: null,
          list: { space: { workspaceId } },
        },
      });
      if (count !== ids.length) {
        throw new UnprocessableEntityException({
          message: 'RELATIONSHIP contem taskIds que nao existem no workspace',
          code: 'CUSTOM_FIELD_REF_NOT_FOUND',
          type,
        });
      }
    }

    // TEAM: sem tabela Team no schema. Validacao de existencia fica pendente
    // ate o modulo de Teams ser introduzido. Por ora aceitamos qualquer id
    // que passe pelo dispatcher (formato cuid/uuid).
  }

  private async userBelongsToWorkspace(
    userId: string,
    workspaceId: string,
  ): Promise<boolean> {
    const member = await this.prisma.workspaceMember.findFirst({
      where: { workspaceId, userId },
      select: { id: true },
    });
    return member !== null;
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
      valueBoolean?: boolean | null;
      valueJson?: Prisma.JsonValue | null;
    },
  ): string | number | boolean | Date | null {
    switch (type) {
      case CustomFieldType.NUMBER:
      case CustomFieldType.QUANTITY:
      case CustomFieldType.CURRENCY:
      case CustomFieldType.PERCENTAGE:
      case CustomFieldType.DURATION:
      case CustomFieldType.RATING:
        if (row.valueNumber === null || row.valueNumber === undefined) {
          return null;
        }
        return typeof row.valueNumber === 'number'
          ? row.valueNumber
          : Number(row.valueNumber);
      case CustomFieldType.DATE:
        return row.valueDate;
      case CustomFieldType.CHECKBOX:
        return row.valueBoolean ?? null;
      case CustomFieldType.PEOPLE:
      case CustomFieldType.RELATIONSHIP:
        // Tipos array/json nao sao suportados como trigger de requiredWhen
        // (compara igualdade === string). Retorna null pra nao casar.
        return null;
      default:
        return row.valueText;
    }
  }

  // Cascata de custom fields derivados (config.derivedFrom): a partir do
  // campo alterado regrava cada dependente em largura. Fonte vazia nao
  // recalcula; `visited` corta ciclo de config.
  private async recalculateDerived(
    tx: Prisma.TransactionClient,
    taskId: string,
    changedDefinitionId: string,
    changedValue: number | null,
    workspaceId: string,
  ): Promise<DerivedFieldChange[]> {
    const defs = await tx.customFieldDefinition.findMany({
      where: {
        deletedAt: null,
        type: CustomFieldType.CURRENCY,
        OR: [{ workspaceId }, { workspaceId: null }],
      },
      select: { id: true, config: true },
    });

    const dependentsBySource = new Map<
      string,
      { id: string; rule: DerivationRule }[]
    >();
    for (const def of defs) {
      const rule = this.parseDerivationRule(def.config);
      if (!rule) continue;
      const list = dependentsBySource.get(rule.sourceDefinitionId) ?? [];
      list.push({ id: def.id, rule });
      dependentsBySource.set(rule.sourceDefinitionId, list);
    }
    if (dependentsBySource.size === 0) return [];

    const rows = await tx.customFieldValue.findMany({
      where: { workItemId: taskId },
      select: { definitionId: true, valueNumber: true },
    });
    const values = new Map<string, number | null>();
    for (const row of rows) {
      values.set(
        row.definitionId,
        row.valueNumber === null ? null : Number(row.valueNumber),
      );
    }
    values.set(changedDefinitionId, changedValue);

    const changes: DerivedFieldChange[] = [];
    const queue: string[] = [changedDefinitionId];
    const visited = new Set<string>();
    while (queue.length > 0) {
      const sourceId = queue.shift() as string;
      if (visited.has(sourceId)) continue;
      visited.add(sourceId);

      const sourceValue = values.get(sourceId) ?? null;
      if (sourceValue === null) continue;

      for (const dependent of dependentsBySource.get(sourceId) ?? []) {
        const before = values.get(dependent.id) ?? null;
        const after = this.applyDerivation(sourceValue, dependent.rule);
        if (after === before) continue;

        await tx.customFieldValue.upsert({
          where: {
            workItemId_definitionId: {
              workItemId: taskId,
              definitionId: dependent.id,
            },
          },
          create: {
            workItemId: taskId,
            definitionId: dependent.id,
            valueNumber: after,
          },
          update: { valueNumber: after },
        });
        values.set(dependent.id, after);
        changes.push({ definitionId: dependent.id, before, after });
        queue.push(dependent.id);
      }
    }
    return changes;
  }

  private parseDerivationRule(
    config: Prisma.JsonValue | null,
  ): DerivationRule | null {
    if (
      typeof config !== 'object' ||
      config === null ||
      Array.isArray(config)
    ) {
      return null;
    }
    const raw = config as Record<string, unknown>;
    const sourceDefinitionId = raw.derivedFrom;
    const operation = raw.operation;
    const factor = raw.factor;
    if (
      typeof sourceDefinitionId !== 'string' ||
      sourceDefinitionId.length === 0 ||
      (operation !== 'multiply' && operation !== 'divide') ||
      typeof factor !== 'number' ||
      !Number.isFinite(factor) ||
      factor === 0
    ) {
      return null;
    }
    return { sourceDefinitionId, operation, factor };
  }

  private applyDerivation(source: number, rule: DerivationRule): number {
    const raw =
      rule.operation === 'divide' ? source / rule.factor : source * rule.factor;
    return Math.round(raw * 100) / 100;
  }

  private parseRollupConfig(
    config: Prisma.JsonValue | null,
  ): RollupConfig | null {
    if (
      typeof config !== 'object' ||
      config === null ||
      Array.isArray(config)
    ) {
      return null;
    }
    const raw = config as Record<string, unknown>;
    const sourceRelationshipFieldId = raw.sourceRelationshipFieldId;
    const sourceCostFieldId = raw.sourceCostFieldId;
    const operation = raw.operation;
    if (
      typeof sourceRelationshipFieldId !== 'string' ||
      sourceRelationshipFieldId.length === 0 ||
      typeof sourceCostFieldId !== 'string' ||
      sourceCostFieldId.length === 0 ||
      operation !== 'sumProduct'
    ) {
      return null;
    }
    return { sourceRelationshipFieldId, sourceCostFieldId, operation };
  }

  private parseRelationshipItems(
    valueJson: Prisma.JsonValue | null,
  ): RelationshipItem[] {
    if (
      typeof valueJson !== 'object' ||
      valueJson === null ||
      Array.isArray(valueJson)
    ) {
      return [];
    }
    const raw = (valueJson as Record<string, unknown>).items;
    if (!Array.isArray(raw)) return [];
    const out: RelationshipItem[] = [];
    for (const item of raw) {
      if (typeof item !== 'object' || item === null || Array.isArray(item)) {
        continue;
      }
      const obj = item as Record<string, unknown>;
      const taskId = obj.taskId;
      const quantity = obj.quantity;
      if (typeof taskId !== 'string' || typeof quantity !== 'number') {
        continue;
      }
      out.push({ taskId, quantity });
    }
    return out;
  }

  private async recalculateRollupValue(
    tx: Prisma.TransactionClient,
    taskId: string,
    rollupDefinitionId: string,
    workspaceId: string,
  ): Promise<DerivedFieldChange[]> {
    const rollupDef = await tx.customFieldDefinition.findFirst({
      where: { id: rollupDefinitionId, deletedAt: null },
      select: { id: true, type: true, config: true },
    });
    if (!rollupDef || rollupDef.type !== CustomFieldType.ROLLUP) return [];
    const rollupConfig = this.parseRollupConfig(rollupDef.config);
    if (!rollupConfig) return [];

    const relationshipRow = await tx.customFieldValue.findUnique({
      where: {
        workItemId_definitionId: {
          workItemId: taskId,
          definitionId: rollupConfig.sourceRelationshipFieldId,
        },
      },
      select: { valueJson: true },
    });
    const items = relationshipRow
      ? this.parseRelationshipItems(relationshipRow.valueJson)
      : [];

    let total = 0;
    if (items.length > 0) {
      const insumoCosts = await tx.customFieldValue.findMany({
        where: {
          definitionId: rollupConfig.sourceCostFieldId,
          workItemId: { in: items.map((i) => i.taskId) },
        },
        select: { workItemId: true, valueNumber: true },
      });
      const costByTask = new Map<string, number>();
      for (const row of insumoCosts) {
        if (row.valueNumber === null) continue;
        costByTask.set(row.workItemId, Number(row.valueNumber));
      }
      for (const item of items) {
        const cost = costByTask.get(item.taskId) ?? 0;
        total += cost * item.quantity;
      }
    }
    const rounded = Math.round(total * 100) / 100;

    const previous = await tx.customFieldValue.findUnique({
      where: {
        workItemId_definitionId: {
          workItemId: taskId,
          definitionId: rollupDefinitionId,
        },
      },
      select: { valueNumber: true },
    });
    const before =
      previous?.valueNumber === null || previous?.valueNumber === undefined
        ? null
        : Number(previous.valueNumber);

    if (before === rounded) return [];

    await tx.customFieldValue.upsert({
      where: {
        workItemId_definitionId: {
          workItemId: taskId,
          definitionId: rollupDefinitionId,
        },
      },
      create: {
        workItemId: taskId,
        definitionId: rollupDefinitionId,
        valueNumber: rounded,
      },
      update: { valueNumber: rounded },
    });

    const changes: DerivedFieldChange[] = [
      { definitionId: rollupDefinitionId, before, after: rounded, taskId },
    ];
    const derived = await this.recalculateDerived(
      tx,
      taskId,
      rollupDefinitionId,
      rounded,
      workspaceId,
    );
    for (const d of derived) {
      changes.push({ ...d, taskId });
    }
    return changes;
  }

  private async recalculateRollupsForRelationship(
    tx: Prisma.TransactionClient,
    taskId: string,
    relationshipDefinitionId: string,
    workspaceId: string,
  ): Promise<DerivedFieldChange[]> {
    const rollups = await tx.customFieldDefinition.findMany({
      where: {
        deletedAt: null,
        type: CustomFieldType.ROLLUP,
        OR: [{ workspaceId }, { workspaceId: null }],
      },
      select: { id: true, config: true },
    });
    const out: DerivedFieldChange[] = [];
    for (const rollup of rollups) {
      const cfg = this.parseRollupConfig(rollup.config);
      if (!cfg || cfg.sourceRelationshipFieldId !== relationshipDefinitionId) {
        continue;
      }
      const changes = await this.recalculateRollupValue(
        tx,
        taskId,
        rollup.id,
        workspaceId,
      );
      out.push(...changes);
    }
    return out;
  }

  private async recalculateRollupsForCostSource(
    tx: Prisma.TransactionClient,
    sourceTaskId: string,
    costDefinitionId: string,
    workspaceId: string,
  ): Promise<DerivedFieldChange[]> {
    const rollups = await tx.customFieldDefinition.findMany({
      where: {
        deletedAt: null,
        type: CustomFieldType.ROLLUP,
        OR: [{ workspaceId }, { workspaceId: null }],
      },
      select: { id: true, config: true },
    });
    const out: DerivedFieldChange[] = [];
    for (const rollup of rollups) {
      const cfg = this.parseRollupConfig(rollup.config);
      if (!cfg || cfg.sourceCostFieldId !== costDefinitionId) continue;
      const productRows = await tx.customFieldValue.findMany({
        where: {
          definitionId: cfg.sourceRelationshipFieldId,
          valueJson: { path: ['taskIds'], array_contains: sourceTaskId },
        },
        select: { workItemId: true },
      });
      for (const row of productRows) {
        const changes = await this.recalculateRollupValue(
          tx,
          row.workItemId,
          rollup.id,
          workspaceId,
        );
        out.push(...changes);
      }
    }
    return out;
  }
}
