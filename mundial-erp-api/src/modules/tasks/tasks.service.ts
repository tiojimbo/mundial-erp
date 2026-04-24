import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type Redis from 'ioredis';
import { PrismaService } from '../../database/prisma.service';
import { REDIS_CLIENT } from '../../common/redis/redis.constants';
import { MergeCycleException } from '../../common/exceptions/merge-cycle.exception';
import { TasksRepository } from './tasks.repository';
import { TaskFiltersDto } from './dtos/task-filters.dto';
import { CreateTaskDto } from './dtos/create-task.dto';
import { UpdateTaskDto } from './dtos/update-task.dto';
import { MergeTasksDto } from './dtos/merge-tasks.dto';
import { TaskResponseDto } from './dtos/task-response.dto';
import {
  TaskAssigneeSummaryDto,
  TaskDetailResponseDto,
  TaskWatcherSummaryDto,
} from './dtos/task-detail-response.dto';
import { TaskOutboxService } from '../task-outbox/task-outbox.service';
import { TaskDependenciesRepository } from '../task-dependencies/task-dependencies.repository';
import { TaskLinksRepository } from '../task-links/task-links.repository';
import { AssigneesSyncService } from './services/assignees-sync.service';
import { WatchersSyncService } from './services/watchers-sync.service';
import { TagsSyncService } from './services/tags-sync.service';
import { diffWorkItem } from './helpers/diff-work-item';

/**
 * Envelope canonico `{data, meta}` retornado por todas as rotas deste modulo.
 */
export interface TasksEnvelope<T> {
  data: T;
  meta: Record<string, unknown>;
}

export interface TimeInStatusEntry {
  statusId: string;
  totalSeconds: number;
  enteredCount: number;
}

export interface TimeInStatusResult {
  taskId: string;
  entries: TimeInStatusEntry[];
  totalSeconds: number;
}

/**
 * Resultado final (e cacheado via Idempotency-Key) do merge.
 * Exposto no envelope `{data, meta}` para o caller.
 */
export interface MergeResult {
  taskId: string;
  mergedSourcesCount: number;
  idempotent: boolean;
}

/** TTL do cache de idempotencia de merge (24h — §8.4). */
const MERGE_IDEMPOTENCY_TTL_SECONDS = 24 * 60 * 60;

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(
    // `$transaction` e a UNICA primitiva Prisma que o service toca —
    // abertura de unidade atomica e orquestracao transversal cross-repo.
    // Escritas/leitoras vao sempre via repositories, recebendo `tx`.
    private readonly prisma: PrismaService,
    private readonly repository: TasksRepository,
    private readonly depsRepository: TaskDependenciesRepository,
    private readonly linksRepository: TaskLinksRepository,
    @Inject(forwardRef(() => TaskOutboxService))
    private readonly outbox: TaskOutboxService,
    private readonly assigneesSync: AssigneesSyncService,
    private readonly watchersSync: WatchersSyncService,
    private readonly tagsSync: TagsSyncService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  /**
   * Cria uma task dentro de um process (PLANO-TASKS.md §7.2).
   *
   * Fluxo:
   *   1. Valida cross-tenant: process pertence ao workspace (404 se nao — §8.1).
   *   2. Resolve statusId: usa `dto.statusId` se fornecido, senao primeiro
   *      `WorkflowStatus NOT_STARTED` do departamento do process.
   *   3. Valida datas: `dueDate >= startDate` (400 se invalido).
   *   4. Em `$transaction`:
   *      a. `repository.createTask(tx, ...)` — cria WorkItem via repository.
   *         ADR-001: NUNCA escreve `primaryAssigneeCache` direto aqui.
   *      b. `assigneesSync.syncAssignees(tx, ...)` se houver — extension
   *         recalcula o cache na insercao dos `work_item_assignees`.
   *      c. `watchersSync.syncWatchers(tx, ...)` se houver.
   *      d. `tagsSync.syncTags(tx, ...)` se houver.
   *      e. Enqueue outbox `CREATED`.
   *      f. Recarrega pelo select padrao (cache de assignee ja refletido).
   *   5. Envelope `{ data, meta: { processId, taskId } }`.
   *
   * Budget de queries (best case sem colecoes): process-in-ws(1) + status(2)
   * + create(1) + outbox(1) + findBySelect(1) = 6. Com colecoes cheias:
   * +1 por assignee/watcher/tag (com outbox embutido). Respeita <= 10 no P95.
   */
  async create(
    workspaceId: string,
    processId: string,
    dto: CreateTaskDto,
    actorUserId: string,
  ): Promise<TaskResponseDto> {
    // 1) Cross-tenant 404 antes de qualquer coisa (§8.1).
    const process = await this.repository.findProcessInWorkspace(
      workspaceId,
      processId,
    );
    if (!process) {
      throw new NotFoundException('Process nao encontrado');
    }

    // 2) Resolve statusId (dto tem prioridade; fallback NOT_STARTED padrao).
    let statusId = dto.statusId;
    if (!statusId) {
      const defaultStatus =
        await this.repository.findFirstStatusForProcess(processId);
      if (!defaultStatus) {
        throw new BadRequestException(
          'Nenhum WorkflowStatus NOT_STARTED disponivel para este process',
        );
      }
      statusId = defaultStatus.id;
    }

    // 3) Datas: dueDate >= startDate (espelhando regra do update).
    if (dto.dueDate && dto.startDate && dto.dueDate < dto.startDate) {
      throw new BadRequestException('dueDate deve ser >= startDate');
    }

    // 4) Transacao atomica: create + colecoes + outbox.
    const row = await this.prisma.$transaction(async (tx) => {
      const created = await this.repository.createTask(tx, {
        processId,
        title: dto.title,
        description: dto.description ?? null,
        markdownContent: dto.markdownContent ?? null,
        statusId,
        priority: dto.priority,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        startDate: dto.startDate ? new Date(dto.startDate) : null,
        estimatedMinutes: dto.estimatedMinutes ?? null,
        points: dto.points ?? null,
        customTypeId: dto.customTypeId ?? null,
        parentId: dto.parentId ?? null,
        creatorId: actorUserId,
      });

      const taskId = created.id;

      if (dto.assignees?.length) {
        await this.assigneesSync.syncAssignees(tx, {
          taskId,
          add: dto.assignees,
          rem: [],
          actorUserId,
          workspaceId,
        });
      }
      if (dto.watchers?.length) {
        await this.watchersSync.syncWatchers(tx, {
          taskId,
          add: dto.watchers,
          rem: [],
          actorUserId,
          workspaceId,
        });
      }
      if (dto.tagIds?.length) {
        await this.tagsSync.syncTags(tx, {
          taskId,
          add: dto.tagIds,
          rem: [],
          actorUserId,
          workspaceId,
        });
      }

      // Payload enriquecido para o formatter do activity feed (frontend):
      // expoe os 9 campos semanticos espelhando o contrato do `diffWorkItem`.
      // Datas convertidas para ISO (ou null) para evitar serializacao ambigua
      // de `Date` no JSON do outbox.
      await this.outbox.enqueue(tx, {
        aggregateId: taskId,
        eventType: 'CREATED',
        payload: {
          taskId,
          processId,
          actorId: actorUserId,
          workspaceId,
          title: dto.title,
          statusId,
          priority: dto.priority ?? null,
          dueDate: dto.dueDate ? new Date(dto.dueDate).toISOString() : null,
          startDate: dto.startDate
            ? new Date(dto.startDate).toISOString()
            : null,
          points: dto.points ?? null,
          customTypeId: dto.customTypeId ?? null,
        },
        workspaceId,
      });

      // Recarrega pelo select canonico — captura `primaryAssigneeCache`
      // atualizado pela Prisma extension (ADR-001).
      return this.repository.findBySelect(taskId, tx);
    });

    this.logger.log(
      `task.created task=${row.id} process=${processId} ws=${workspaceId} actor=${actorUserId}`,
    );

    // O envelope `{data, meta}` e adicionado pelo `ResponseInterceptor` global
    // — service retorna apenas o DTO para nao duplicar wrap (seria `data.data`
    // no cliente, que quebra `task.id` nos callbacks de navegacao).
    return TaskResponseDto.fromRow(row as unknown as Record<string, unknown>);
  }

  async list(
    workspaceId: string,
    filters: TaskFiltersDto,
  ): Promise<TasksEnvelope<TaskResponseDto[]>> {
    const { items, total, hasMore, nextCursor } =
      await this.repository.findMany(workspaceId, filters);
    const data = items.map((row) =>
      TaskResponseDto.fromRow(row as unknown as Record<string, unknown>),
    );
    return {
      data,
      meta: {
        total,
        page: filters.page,
        limit: filters.limit,
        hasMore,
        nextCursor,
        orderBy: filters.orderBy,
        direction: filters.direction,
      },
    };
  }

  async findById(
    workspaceId: string,
    taskId: string,
    includes: ReadonlySet<string>,
  ): Promise<TaskDetailResponseDto> {
    const row = await this.repository.findById(workspaceId, taskId, includes);
    if (!row) {
      // Cross-tenant: 404 (nunca 403 — §8.1).
      throw new NotFoundException('Task nao encontrada');
    }

    const dto = TaskDetailResponseDto.fromDetailRow(
      row as unknown as Record<string, unknown>,
      includes,
    );

    // Fetches adicionais sob demanda para manter o include principal barato.
    if (includes.has('assignees')) {
      const assignees = await this.repository.findAssignees(taskId);
      dto.assignees = assignees.map(
        (a): TaskAssigneeSummaryDto => ({
          id: a.user.id,
          name: a.user.name,
          email: a.user.email,
          isPrimary: a.isPrimary,
        }),
      );
    }
    if (includes.has('watchers')) {
      const watchers = await this.repository.findWatchers(taskId);
      dto.watchers = watchers.map(
        (w): TaskWatcherSummaryDto => ({
          id: w.user.id,
          name: w.user.name,
          email: w.user.email,
        }),
      );
    }

    // Interceptor global envelopa; service retorna DTO direto.
    return dto;
  }

  async update(
    workspaceId: string,
    taskId: string,
    dto: UpdateTaskDto,
    actorId: string,
  ): Promise<TasksEnvelope<TaskResponseDto>> {
    const existing = await this.repository.findExistenceRow(
      workspaceId,
      taskId,
    );
    if (!existing || existing.deletedAt) {
      throw new NotFoundException('Task nao encontrada');
    }

    // Proibicao critica ADR-001: nunca escrever `primaryAssigneeCache`
    // diretamente. Assignees passam por `dto.assignees = { add, rem }` e
    // a extension Prisma recalcula o cache.
    const data: Prisma.WorkItemUncheckedUpdateInput = {};

    if (dto.title !== undefined) data.title = dto.title;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.markdownContent !== undefined)
      data.markdownContent = dto.markdownContent;
    if (dto.statusId !== undefined) data.statusId = dto.statusId;
    if (dto.priority !== undefined) data.priority = dto.priority;
    if (dto.dueDate !== undefined)
      data.dueDate = dto.dueDate ? new Date(dto.dueDate) : null;
    if (dto.startDate !== undefined)
      data.startDate = dto.startDate ? new Date(dto.startDate) : null;
    if (dto.estimatedMinutes !== undefined)
      data.estimatedMinutes = dto.estimatedMinutes;
    if (dto.points !== undefined) data.points = dto.points ?? null;
    if (dto.customTypeId !== undefined)
      data.customTypeId = dto.customTypeId ?? null;
    if (dto.parentId !== undefined) data.parentId = dto.parentId ?? null;
    if (dto.processId !== undefined) data.processId = dto.processId;
    if (dto.archived !== undefined) {
      data.archived = dto.archived;
      data.archivedAt = dto.archived ? new Date() : null;
    }

    if (dto.dueDate && dto.startDate && dto.dueDate < dto.startDate) {
      throw new BadRequestException('dueDate deve ser >= startDate');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      // Colecoes: aplicadas dentro da transacao via sync services especializados
      // (task-tags, task-watchers, assignees). Cada um recebe `tx` para manter
      // atomicidade sem conhecer Prisma diretamente no service.
      if (dto.tagIds) {
        await this.tagsSync.syncTags(tx, {
          taskId,
          add: dto.tagIds.add ?? [],
          rem: dto.tagIds.rem ?? [],
          actorUserId: actorId,
          workspaceId,
        });
      }
      if (dto.watchers) {
        await this.watchersSync.syncWatchers(tx, {
          taskId,
          add: dto.watchers.add ?? [],
          rem: dto.watchers.rem ?? [],
          actorUserId: actorId,
          workspaceId,
        });
      }
      if (dto.assignees) {
        await this.assigneesSync.syncAssignees(tx, {
          taskId,
          add: dto.assignees.add ?? [],
          rem: dto.assignees.rem ?? [],
          actorUserId: actorId,
          workspaceId,
        });
      }

      // Escalar update delegado ao repository com `tx` — nunca `tx.workItem.*`
      // direto no service (Bravy regra 2 + 6: persistencia so via repository).
      if (Object.keys(data).length > 0) {
        // Snapshot `before` dentro da mesma tx — leitura consistente (serializavel)
        // com o UPDATE que segue. `findForDiff` ja filtra por workspaceId
        // transitivo (defesa em profundidade cross-tenant).
        const before = await this.repository.findForDiff(
          workspaceId,
          taskId,
          tx,
        );
        if (!before) {
          // Defesa redundante: existencia ja foi validada acima, mas uma race
          // com soft-delete entre os dois `find` e teoricamente possivel.
          throw new NotFoundException('Task nao encontrada');
        }

        const updatedRow = await this.repository.update(taskId, data, tx);

        // Diff -> outbox: 0..9 eventos por update, todos enfileirados na
        // mesma tx (ADR-003: atomicidade commit primario + insert outbox).
        const events = diffWorkItem(before, data, actorId, workspaceId);
        for (const ev of events) {
          await this.outbox.enqueue(tx, {
            aggregateId: taskId,
            workspaceId,
            eventType: ev.eventType,
            payload: ev.payload,
          });
        }

        return updatedRow;
      }
      return this.repository.findBySelect(taskId, tx);
    });

    return {
      data: TaskResponseDto.fromRow(
        updated as unknown as Record<string, unknown>,
      ),
      meta: { taskId },
    };
  }

  async remove(workspaceId: string, taskId: string): Promise<void> {
    // `updateMany` idempotente: se ja estava deletada, retorna count=0 sem
    // erro. 204 sempre que a task for do workspace (ou se nao existir).
    const existing = await this.repository.findExistenceRow(
      workspaceId,
      taskId,
    );
    if (!existing) {
      // Cross-tenant/inexistente -> 404 (§8.1). Ja-deletada recai no ramo
      // de soft-delete idempotente abaixo (existing.deletedAt != null).
      throw new NotFoundException('Task nao encontrada');
    }
    await this.repository.softDelete(workspaceId, taskId);
  }

  async archive(
    workspaceId: string,
    taskId: string,
    actorId: string,
  ): Promise<TasksEnvelope<TaskResponseDto>> {
    return this.setArchivedWithOutbox(workspaceId, taskId, true, actorId);
  }

  async unarchive(
    workspaceId: string,
    taskId: string,
    actorId: string,
  ): Promise<TasksEnvelope<TaskResponseDto>> {
    return this.setArchivedWithOutbox(workspaceId, taskId, false, actorId);
  }

  private async setArchivedWithOutbox(
    workspaceId: string,
    taskId: string,
    archived: boolean,
    actorId: string,
  ): Promise<TasksEnvelope<TaskResponseDto>> {
    const existing = await this.repository.findExistenceRow(
      workspaceId,
      taskId,
    );
    if (!existing || existing.deletedAt) {
      throw new NotFoundException('Task nao encontrada');
    }
    if (existing.archived === archived) {
      // Idempotente: estado ja desejado — retorna representacao atual.
      const row = await this.repository.findById(
        workspaceId,
        taskId,
        new Set(),
      );
      return {
        data: TaskResponseDto.fromRow(
          row as unknown as Record<string, unknown>,
        ),
        meta: { archived, idempotent: true },
      };
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const row = await this.repository.setArchived(taskId, archived, tx);
      await this.outbox.enqueue(tx, {
        aggregateId: taskId,
        eventType: archived ? 'ARCHIVED' : 'UNARCHIVED',
        payload: { taskId, actorId, archived },
        workspaceId,
      });
      return row;
    });

    return {
      data: TaskResponseDto.fromRow(
        updated as unknown as Record<string, unknown>,
      ),
      meta: { archived },
    };
  }

  /**
   * Merge de 1–50 sources no target (PLANO-TASKS.md §8.4).
   *
   * Fluxo:
   *   1. Idempotency-Key (opcional, header): Redis SETNX TTL 24h; hit retorna
   *      resultado cacheado com `idempotent: true`.
   *   2. Validacoes: target != sources; todas no mesmo workspace; nenhuma
   *      ja mergida (409); target nao descendente de nenhuma source (409).
   *   3. Em `$transaction`:
   *      - Move checklists, attachments, comments para target.
   *      - Move dependencies / links (dedup contra o target).
   *      - Une tags (ON CONFLICT DO NOTHING).
   *      - Soma timeSpentSeconds + trackedMinutes em target.
   *      - Marca sources: mergedIntoId=target, archived=true, deletedAt=now().
   *      - Enqueue outbox MERGED_INTO (1 por source).
   *   4. Cacheia resultado em Redis TTL 24h para replay idempotente.
   */
  async merge(
    workspaceId: string,
    targetTaskId: string,
    body: MergeTasksDto,
    actorUserId: string,
    idempotencyKey?: string,
  ): Promise<TasksEnvelope<MergeResult>> {
    const startedAt = Date.now();
    const sourceTaskIds = Array.from(new Set(body.sourceTaskIds));

    // --- 1) Idempotency-Key (pre-check): retorna cached se ja processado.
    const idemKey = idempotencyKey
      ? this.buildMergeIdempotencyKey(workspaceId, idempotencyKey)
      : null;
    if (idemKey) {
      const cached = await this.safeRedisGet(idemKey);
      if (cached) {
        try {
          const parsed = JSON.parse(cached) as MergeResult;
          return {
            data: { ...parsed, idempotent: true },
            meta: { idempotent: true, idempotencyKey },
          };
        } catch {
          // Cache corrompido — segue fluxo normal.
          this.logger.warn(`merge idem cache parse fail key=${idemKey}`);
        }
      }
    }

    // --- 2) Validacoes de entrada antes da tx (cheap path).
    if (sourceTaskIds.includes(targetTaskId)) {
      throw new BadRequestException('Target nao pode estar em sourceTaskIds');
    }

    // --- 3) Transacao: todo o movimento em uma unica unidade atomica.
    //   Toda persistencia e via repositories (tasks / deps / links) — o
    //   service nunca toca delegates Prisma diretamente.
    const result = await this.prisma.$transaction(async (tx) => {
      // 3.1) Carrega target + sources com select minimo (1 query).
      const ids = [targetTaskId, ...sourceTaskIds];
      const rows = await this.repository.findForMerge(workspaceId, ids, tx);

      const byId = new Map(rows.map((r) => [r.id, r] as const));
      const target = byId.get(targetTaskId);
      if (!target || target.deletedAt) {
        // Cross-tenant ou ausente: 404 (nunca 403 — §8.1).
        throw new NotFoundException('Task nao encontrada');
      }

      const sources = sourceTaskIds.map((sid) => {
        const row = byId.get(sid);
        if (!row || row.deletedAt) {
          throw new NotFoundException('Task nao encontrada');
        }
        if (row.mergedIntoId !== null) {
          throw new ConflictException({
            message: 'Source ja foi mergida em outra task',
            code: 'SOURCE_ALREADY_MERGED',
            sourceId: sid,
            mergedIntoId: row.mergedIntoId,
          });
        }
        return row;
      });

      // 3.2) MergeCycle: BFS subindo parentId — se encontrar source, ciclo.
      await this.assertNoMergeCycle(tx, targetTaskId, new Set(sourceTaskIds));

      // 3.3) Coleções filhas (checklists/attachments/comments) via repo.
      await this.repository.moveChildCollectionsToTarget(
        sourceTaskIds,
        targetTaskId,
        tx,
      );

      // 3.4) Arestas (deps + links) via repositories dos proprios modulos.
      //   Encapsulamento correto: cada repo sabe como dedup seu proprio
      //   unique `(fromTaskId, toTaskId)` sem que TasksService conheca
      //   os delegates Prisma.
      await this.depsRepository.moveEdgesForMerge(
        sourceTaskIds,
        targetTaskId,
        tx,
      );
      await this.linksRepository.moveEdgesForMerge(
        sourceTaskIds,
        targetTaskId,
        tx,
      );

      // 3.5) Unir tag-links no target (dedup via ON CONFLICT no repo).
      await this.repository.unionTagLinksToTarget(
        sourceTaskIds,
        targetTaskId,
        tx,
      );

      // 3.6) Somar totals (seconds + minutes) no target.
      const totalTimeSeconds = sources.reduce(
        (acc, s) => acc + (s.timeSpentSeconds ?? 0),
        0,
      );
      const totalTrackedMinutes = sources.reduce(
        (acc, s) => acc + (s.trackedMinutes ?? 0),
        0,
      );
      await this.repository.incrementTotalsOnTarget(
        targetTaskId,
        totalTimeSeconds,
        totalTrackedMinutes,
        tx,
      );

      // 3.7) Finalizar sources (mergedIntoId + archived + deletedAt).
      const now = new Date();
      await this.repository.markSourcesMerged(
        sourceTaskIds,
        targetTaskId,
        now,
        tx,
      );

      // 3.8) Enqueue outbox — 1 evento MERGED_INTO por source.
      for (const sourceId of sourceTaskIds) {
        await this.outbox.enqueue(tx, {
          aggregateId: sourceId,
          eventType: 'MERGED_INTO',
          payload: {
            sourceId,
            targetId: targetTaskId,
            actorUserId,
          },
          workspaceId,
        });
      }

      return {
        taskId: targetTaskId,
        mergedSourcesCount: sourceTaskIds.length,
        idempotent: false,
      } as MergeResult;
    });

    // --- 4) Cacheia resultado (best-effort) para replay idempotente.
    if (idemKey) {
      await this.safeRedisSetNx(
        idemKey,
        JSON.stringify(result),
        MERGE_IDEMPOTENCY_TTL_SECONDS,
      );
    }

    this.logger.log({
      operation: 'merge',
      targetId: targetTaskId,
      sourcesCount: sourceTaskIds.length,
      durationMs: Date.now() - startedAt,
      workspaceId,
      actorUserId,
      idempotencyKey: idempotencyKey ?? null,
    });

    return {
      data: result,
      meta: {
        idempotent: false,
        ...(idempotencyKey ? { idempotencyKey } : {}),
      },
    };
  }

  /**
   * BFS subindo `parentId` a partir do target. Se encontrar uma das sources,
   * o target e descendente dela — lanca MergeCycleException. Leitura dos
   * parents via `repository.findParentsForCycleCheck` (sem Prisma no service).
   *
   * Limite: 1024 nodes visitados (defesa DoS — alinhado ao CycleDetector).
   */
  private async assertNoMergeCycle(
    tx: Prisma.TransactionClient,
    targetId: string,
    sourceIdSet: ReadonlySet<string>,
  ): Promise<void> {
    const visited = new Set<string>();
    let frontier: string[] = [targetId];
    const MAX_NODES = 1024;

    while (frontier.length > 0) {
      if (visited.size > MAX_NODES) {
        throw new BadRequestException(
          'Cadeia de parentId excede o limite de profundidade',
        );
      }
      const rows = await this.repository.findParentsForCycleCheck(
        frontier,
        tx,
      );
      const nextFrontier: string[] = [];
      for (const r of rows) {
        if (visited.has(r.id)) continue;
        visited.add(r.id);
        if (r.parentId === null) continue;
        if (sourceIdSet.has(r.parentId)) {
          throw new MergeCycleException(targetId, r.parentId);
        }
        if (!visited.has(r.parentId)) {
          nextFrontier.push(r.parentId);
        }
      }
      frontier = nextFrontier;
    }
  }

  private buildMergeIdempotencyKey(
    workspaceId: string,
    idempotencyKey: string,
  ): string {
    return `merge:${workspaceId}:${idempotencyKey}`;
  }

  private async safeRedisGet(key: string): Promise<string | null> {
    try {
      return await this.redis.get(key);
    } catch (err) {
      this.logger.warn(`redis GET fail (${key}): ${(err as Error).message}`);
      return null;
    }
  }

  private async safeRedisSetNx(
    key: string,
    value: string,
    ttlSeconds: number,
  ): Promise<void> {
    try {
      await this.redis.set(key, value, 'EX', ttlSeconds, 'NX');
    } catch (err) {
      this.logger.warn(`redis SETNX fail (${key}): ${(err as Error).message}`);
    }
  }

  async timeInStatus(
    workspaceId: string,
    taskId: string,
  ): Promise<TasksEnvelope<TimeInStatusResult>> {
    const existing = await this.repository.findExistenceRow(
      workspaceId,
      taskId,
    );
    if (!existing || existing.deletedAt) {
      throw new NotFoundException('Task nao encontrada');
    }

    const rows = await this.repository.findStatusHistory(taskId);
    const agg = this.aggregateTimeInStatus(rows);
    return { data: { taskId, ...agg }, meta: {} };
  }

  async timeInStatusBulk(
    workspaceId: string,
    taskIds: string[],
  ): Promise<TasksEnvelope<TimeInStatusResult[]>> {
    // Assert workspace para cada id — cross-tenant silencioso = ausente.
    const validIds = await this.repository.assertBelongsToWorkspace(
      workspaceId,
      taskIds,
    );
    if (validIds.length === 0) {
      return { data: [], meta: { requested: taskIds.length, returned: 0 } };
    }
    const rows = await this.repository.findStatusHistoryForMany(validIds);
    const grouped = new Map<string, typeof rows>();
    for (const r of rows) {
      const bucket = grouped.get(r.workItemId) ?? [];
      bucket.push(r);
      grouped.set(r.workItemId, bucket);
    }
    const data = validIds.map((id) => {
      const agg = this.aggregateTimeInStatus(grouped.get(id) ?? []);
      return { taskId: id, ...agg };
    });
    return {
      data,
      meta: {
        requested: taskIds.length,
        returned: data.length,
      },
    };
  }

  /**
   * Metodo utilitario: soma segundos acumulados por statusId, fechando entradas
   * abertas com `now()` (task corrente no status atual).
   */
  private aggregateTimeInStatus(
    rows: Array<{
      statusId: string;
      enteredAt: Date;
      leftAt: Date | null;
      durationSeconds: number | null;
    }>,
  ): { entries: TimeInStatusEntry[]; totalSeconds: number } {
    const now = Date.now();
    const byStatus = new Map<string, TimeInStatusEntry>();
    let total = 0;
    for (const r of rows) {
      const dur =
        r.durationSeconds ??
        Math.max(
          0,
          Math.floor(
            ((r.leftAt?.getTime() ?? now) - r.enteredAt.getTime()) / 1000,
          ),
        );
      total += dur;
      const cur = byStatus.get(r.statusId) ?? {
        statusId: r.statusId,
        totalSeconds: 0,
        enteredCount: 0,
      };
      cur.totalSeconds += dur;
      cur.enteredCount += 1;
      byStatus.set(r.statusId, cur);
    }
    return { entries: [...byStatus.values()], totalSeconds: total };
  }
}
