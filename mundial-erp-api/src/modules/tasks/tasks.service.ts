import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
  forwardRef,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import type Redis from 'ioredis';
import { PrismaService } from '../../database/prisma.service';
import { REDIS_CLIENT } from '../../common/redis/redis.constants';
import { MergeCycleException } from '../../common/exceptions/merge-cycle.exception';
import { TasksRepository } from './tasks.repository';
import { TaskFiltersDto } from './dtos/task-filters.dto';
import { CreateTaskDto } from './dtos/create-task.dto';
import { UpdateTaskDto } from './dtos/update-task.dto';
import { AssignTaskDto } from './dtos/assign-task.dto';
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
import { TaskTypeTemplatesRepository } from '../task-type-templates/task-type-templates.repository';
import {
  TASK_TYPE_TEMPLATES_METRICS,
  type TaskTypeTemplatesMetrics,
} from '../task-type-templates/task-type-templates.metrics';
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
    /**
     * Task Type Templates (M2 — TTT-031/TTT-032).
     *
     * `@Optional()` para preservar o construtor em testes unitarios que ja
     * existem e instanciam `new TasksService(...)` posicionalmente sem
     * conhecimento de M2. Sem o repository disponivel (e.g., specs de unidade
     * legados), `create` cai no fluxo legado (sem template) — comportamento
     * idempotente por design.
     *
     * `ConfigService` tambem opcional: a flag
     * `FEATURE_TASK_TYPE_TEMPLATES_ENABLED` so e consultada quando o
     * repository foi injetado, entao a ausencia de config equivale a flag
     * OFF (fluxo legado).
     */
    @Optional()
    private readonly taskTypeTemplatesRepository?: TaskTypeTemplatesRepository,
    @Optional()
    private readonly config?: ConfigService,
    /**
     * Sprint 5 (TTT-050) — incrementa contador apos commit do create
     * quando template foi aplicado. `@Optional()` mantem retro-compat
     * com testes que instanciam `new TasksService(...)` sem M2.
     */
    @Optional()
    @Inject(TASK_TYPE_TEMPLATES_METRICS)
    private readonly templatesMetrics?: TaskTypeTemplatesMetrics,
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
   *   5. Envelope `{ data, meta: { listId, taskId } }`.
   *
   * Budget de queries (best case sem colecoes): process-in-ws(1) + status(2)
   * + create(1) + outbox(1) + findBySelect(1) = 6. Com colecoes cheias:
   * +1 por assignee/watcher/tag (com outbox embutido). Respeita <= 10 no P95.
   */
  async create(
    workspaceId: string,
    dto: CreateTaskDto,
    actorUserId: string,
  ): Promise<TaskResponseDto> {
    // HPP-061: listId vem do body (obrigatorio via DTO). Cross-tenant 404
    // antes de qualquer coisa.
    const listId = dto.listId;
    const process = await this.repository.findProcessInWorkspace(
      workspaceId,
      listId,
    );
    if (!process) {
      throw new NotFoundException('List nao encontrada');
    }

    // 2) Resolve statusId (dto tem prioridade; fallback NOT_STARTED padrao).
    let statusId = dto.statusId;
    if (!statusId) {
      const defaultStatus =
        await this.repository.findFirstStatusForProcess(listId);
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
    let templateApplied = false;
    const row = await this.prisma.$transaction(async (tx) => {
      // 4.0) Template defaults (TTT-032): se a flag esta ON E ha customTypeId,
      // tentamos resolver o template pelo `customTypeId` e aplicar
      // `defaultDescriptionBlocks` em `markdownContent` quando o cliente nao
      // enviou descricao (ou enviou somente blocos vazios). Read-only do
      // template — nada de mutacao em M2 aqui. Cross-tenant filtrado dentro
      // do proprio repository (visibilidade via `customTaskType.workspaceId`).
      // Falha de leitura nao pode quebrar create — degrada gracefully.
      const resolved = await this.resolveMarkdownContentWithTemplate(
        tx,
        dto.markdownContent,
        dto.customTypeId,
        workspaceId,
      );
      templateApplied = resolved.templateApplied;

      const created = await this.repository.createTask(tx, {
        listId,
        title: dto.title,
        description: dto.description ?? null,
        markdownContent: resolved.markdown,
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

      if (dto.assigneeIds?.length) {
        await this.assigneesSync.syncAssignees(tx, {
          taskId,
          add: dto.assigneeIds,
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
          listId,
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

    // Sprint 5 (TTT-050) — incrementa contador apos commit. Adapter Noop
    // ou Prometheus dependendo de METRICS_TOKEN. Nunca quebra create.
    if (templateApplied && dto.customTypeId && this.templatesMetrics) {
      this.templatesMetrics.templatesInstantiatedTotal({
        customTypeId: dto.customTypeId,
        workspaceId,
      });
    }

    this.logger.log(
      `task.created task=${row.id} process=${listId} ws=${workspaceId} actor=${actorUserId}`,
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

  /**
   * HPP-051 — `GET /tasks/space/:spaceId`. Retorna grupos por list, cada
   * um com `{ list: { id, name, folder }, tasks[] }`. 1 query agregada;
   * agrupamento em memoria.
   */
  async findBySpace(
    workspaceId: string,
    spaceId: string,
  ): Promise<
    Array<{
      list: {
        id: string;
        name: string;
        folder: { id: string; name: string } | null;
      };
      tasks: TaskResponseDto[];
    }>
  > {
    const space = await this.prisma.space.findFirst({
      where: { id: spaceId, workspaceId, deletedAt: null },
      select: { id: true },
    });
    if (!space) {
      throw new NotFoundException('Space nao encontrado');
    }

    const rows = await this.repository.findBySpaceGrouped(workspaceId, spaceId);

    const groups = new Map<
      string,
      {
        list: {
          id: string;
          name: string;
          folder: { id: string; name: string } | null;
        };
        tasks: TaskResponseDto[];
      }
    >();
    for (const row of rows) {
      const list = row.list as {
        id: string;
        name: string;
        folder: { id: string; name: string } | null;
      };
      if (!groups.has(list.id)) {
        groups.set(list.id, {
          list: { id: list.id, name: list.name, folder: list.folder ?? null },
          tasks: [],
        });
      }
      const taskRow = { ...row, processId: row.listId } as unknown as Record<
        string,
        unknown
      >;
      groups.get(list.id)!.tasks.push(TaskResponseDto.fromRow(taskRow));
    }

    return Array.from(groups.values());
  }

  /**
   * HPP-052 — `GET /tasks/list?viewId=&level=`. Resolve escopo, busca tasks
   * + statuses elegiveis, agrupa por status. Response Hoppe:
   * `[{ group: { id, name, label, type:STATUS, ... }, tasks: [...] }]`.
   */
  async findByListGrouped(
    workspaceId: string,
    params: {
      viewId?: string;
      level?: string;
      listId?: string;
      folderId?: string;
      spaceId?: string;
    },
  ): Promise<
    Array<{
      group: {
        id: string;
        name: string;
        label: string;
        type: 'STATUS';
        collapsed: boolean;
        field: 'statusId';
        position: number;
        viewId: string | null;
        color: string;
      };
      tasks: TaskResponseDto[];
    }>
  > {
    const scope = await this.resolveListGroupedScope(workspaceId, params);

    const [taskRows, statuses] = await Promise.all([
      this.repository.findByScope(workspaceId, {
        level: scope.level,
        id: scope.id,
      }),
      this.repository.findStatusesForScope(workspaceId, {
        spaceId: scope.spaceId,
        folderId: scope.folderId,
      }),
    ]);

    const tasksByStatus = new Map<string, TaskResponseDto[]>();
    for (const row of taskRows) {
      const taskRow = { ...row, processId: row.listId } as unknown as Record<
        string,
        unknown
      >;
      const dto = TaskResponseDto.fromRow(taskRow);
      const list = tasksByStatus.get(dto.statusId);
      if (list) {
        list.push(dto);
      } else {
        tasksByStatus.set(dto.statusId, [dto]);
      }
    }

    return statuses.map((status) => ({
      group: {
        id: status.id,
        name: status.name,
        label: status.name,
        type: 'STATUS' as const,
        collapsed: false,
        field: 'statusId' as const,
        position: status.sortOrder,
        viewId: params.viewId ?? null,
        color: status.color,
      },
      tasks: tasksByStatus.get(status.id) ?? [],
    }));
  }

  /**
   * HPP-057 — `DELETE /tasks/:id/assignees/:userId`. Remove individual.
   * Idempotente: usuario nao-assignee retorna 200 sem efeito (sync ignora P2025).
   */
  async removeAssignee(
    workspaceId: string,
    taskId: string,
    userId: string,
    actorId: string,
  ): Promise<{ message: string }> {
    const task = await this.repository.findExistenceRow(workspaceId, taskId);
    if (!task) {
      throw new NotFoundException('Task nao encontrada');
    }
    await this.prisma.$transaction(async (tx) => {
      await this.assigneesSync.syncAssignees(tx, {
        taskId,
        add: [],
        rem: [userId],
        actorUserId: actorId,
        workspaceId,
      });
    });
    return { message: 'Assignee removido' };
  }

  /**
   * HPP-056 — `PUT /tasks/:id/assign`. Substitui a lista completa.
   * Body `{ assignees: [{ userId }, ...] }`. Lista vazia volta o creator.
   * Calcula delta {add,rem} e aplica via AssigneesSyncService dentro de tx.
   */
  async assign(
    workspaceId: string,
    taskId: string,
    dto: AssignTaskDto,
    actorId: string,
  ): Promise<
    Array<{
      id: string;
      user: { id: string; name: string; email: string };
      permission: string | null;
      createdAt: Date;
    }>
  > {
    const task = await this.repository.findAssignContext(workspaceId, taskId);
    if (!task) {
      throw new NotFoundException('Task nao encontrada');
    }

    const requested = Array.from(
      new Set(dto.assignees.map((a) => a.userId)),
    ).filter((id) => id.length > 0);
    const target = requested.length === 0 ? [task.creatorId] : requested;

    const current = await this.repository.findAssignees(taskId);
    const currentIds = new Set(current.map((a) => a.userId));
    const targetSet = new Set(target);

    const add = target.filter((id) => !currentIds.has(id));
    const rem = [...currentIds].filter((id) => !targetSet.has(id));

    if (add.length > 0 || rem.length > 0) {
      await this.prisma.$transaction(async (tx) => {
        await this.assigneesSync.syncAssignees(tx, {
          taskId,
          add,
          rem,
          actorUserId: actorId,
          workspaceId,
        });
      });
    }

    return this.findAssignees(workspaceId, taskId);
  }

  /**
   * HPP-055 — `GET /tasks/:id/assignees`. Response Hoppe:
   * `[{ id: userId, user: { id, name, email }, permission, createdAt }]`.
   * `permission` retorna null ate ter mapeamento (Member* em Sprints futuros).
   */
  async findAssignees(
    workspaceId: string,
    taskId: string,
  ): Promise<
    Array<{
      id: string;
      user: { id: string; name: string; email: string };
      permission: string | null;
      createdAt: Date;
    }>
  > {
    const task = await this.repository.findExistenceRow(workspaceId, taskId);
    if (!task) {
      throw new NotFoundException('Task nao encontrada');
    }
    const rows = await this.repository.findAssignees(taskId);
    return rows.map((row) => ({
      id: row.userId,
      user: row.user,
      permission: null,
      createdAt: row.assignedAt,
    }));
  }

  /**
   * HPP-054 — `GET /tasks/:id/subtasks`. Valida parent existe + tenant.
   */
  async findSubtasks(
    workspaceId: string,
    taskId: string,
  ): Promise<TaskResponseDto[]> {
    const parent = await this.repository.findExistenceRow(workspaceId, taskId);
    if (!parent) {
      throw new NotFoundException('Task nao encontrada');
    }
    const rows = await this.repository.findSubtasks(workspaceId, taskId);
    return rows.map((row) =>
      TaskResponseDto.fromRow({
        ...row,
        processId: row.listId,
      } as unknown as Record<string, unknown>),
    );
  }

  /**
   * HPP-053 — `GET /tasks/my-tasks`. Tasks atribuidas ao caller distribuidas
   * em buckets temporais. Single query + bucketing in-memory.
   */
  async findMyTasks(
    workspaceId: string,
    userId: string,
  ): Promise<{
    overdue: TaskResponseDto[];
    today: TaskResponseDto[];
    upcoming: TaskResponseDto[];
    noDate: TaskResponseDto[];
    completed: TaskResponseDto[];
  }> {
    const rows = await this.repository.findMyTasks(workspaceId, userId);

    const now = new Date();
    const startOfToday = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    );
    const startOfTomorrow = new Date(
      startOfToday.getTime() + 24 * 60 * 60 * 1000,
    );

    const buckets = {
      overdue: [] as TaskResponseDto[],
      today: [] as TaskResponseDto[],
      upcoming: [] as TaskResponseDto[],
      noDate: [] as TaskResponseDto[],
      completed: [] as TaskResponseDto[],
    };

    for (const row of rows) {
      const taskRow = { ...row, processId: row.listId } as unknown as Record<
        string,
        unknown
      >;
      const dto = TaskResponseDto.fromRow(taskRow);
      const category = (row as { status?: { category?: string } }).status
        ?.category;
      if (
        category === 'DONE' ||
        category === 'CLOSED' ||
        dto.completedAt !== null ||
        dto.closedAt !== null
      ) {
        buckets.completed.push(dto);
        continue;
      }
      if (!dto.dueDate) {
        buckets.noDate.push(dto);
        continue;
      }
      const due = new Date(dto.dueDate);
      if (due < startOfToday) {
        buckets.overdue.push(dto);
      } else if (due < startOfTomorrow) {
        buckets.today.push(dto);
      } else {
        buckets.upcoming.push(dto);
      }
    }

    return buckets;
  }

  private async resolveListGroupedScope(
    workspaceId: string,
    params: {
      viewId?: string;
      level?: string;
      listId?: string;
      folderId?: string;
      spaceId?: string;
    },
  ): Promise<{
    level: 'list' | 'folder' | 'space';
    id: string;
    spaceId: string;
    folderId: string | null;
  }> {
    if (params.viewId) {
      const view = await this.prisma.processView.findFirst({
        where: { id: params.viewId, deletedAt: null },
        select: {
          id: true,
          listId: true,
          list: {
            select: {
              spaceId: true,
              folderId: true,
              space: { select: { id: true, workspaceId: true } },
              folder: { select: { spaceId: true } },
            },
          },
        },
      });
      if (!view || !view.list) {
        throw new NotFoundException('View nao encontrada');
      }
      const spaceId =
        view.list.spaceId ?? view.list.folder?.spaceId ?? null;
      if (!spaceId || view.list.space?.workspaceId !== workspaceId) {
        throw new NotFoundException('View nao encontrada');
      }
      return {
        level: 'list',
        id: view.listId,
        spaceId,
        folderId: view.list.folderId ?? null,
      };
    }

    const level = params.level as 'list' | 'folder' | 'space' | undefined;
    if (level === 'list' && params.listId) {
      const list = await this.prisma.list.findFirst({
        where: { id: params.listId, deletedAt: null },
        select: {
          id: true,
          spaceId: true,
          folderId: true,
          space: { select: { id: true, workspaceId: true } },
          folder: { select: { spaceId: true } },
        },
      });
      const spaceId = list?.spaceId ?? list?.folder?.spaceId ?? null;
      if (!list || !spaceId || list.space?.workspaceId !== workspaceId) {
        throw new NotFoundException('List nao encontrada');
      }
      return { level: 'list', id: list.id, spaceId, folderId: list.folderId };
    }

    if (level === 'folder' && params.folderId) {
      const folder = await this.prisma.folder.findFirst({
        where: { id: params.folderId, deletedAt: null },
        select: { id: true, spaceId: true, space: { select: { workspaceId: true } } },
      });
      if (!folder || folder.space.workspaceId !== workspaceId) {
        throw new NotFoundException('Folder nao encontrado');
      }
      return {
        level: 'folder',
        id: folder.id,
        spaceId: folder.spaceId,
        folderId: folder.id,
      };
    }

    if (level === 'space' && params.spaceId) {
      const space = await this.prisma.space.findFirst({
        where: { id: params.spaceId, workspaceId, deletedAt: null },
        select: { id: true },
      });
      if (!space) {
        throw new NotFoundException('Space nao encontrado');
      }
      return { level: 'space', id: space.id, spaceId: space.id, folderId: null };
    }

    throw new BadRequestException(
      'Informe viewId ou level+(listId|folderId|spaceId)',
    );
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

    // ADR-001: `primaryAssigneeCache` nunca e escrito direto pela aplicacao.
    // HPP-059: assignees nao trafegam mais por aqui — use PUT /tasks/:id/assign.
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
    const targetListId = dto.listId ?? dto.processId;
    if (targetListId !== undefined) data.listId = targetListId;
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
      // HPP-059: `assignees` removido do PUT /tasks/:id. Use o endpoint
      // dedicado `PUT /tasks/:id/assign` (HPP-056) para substituir lista.

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

  async remove(
    workspaceId: string,
    taskId: string,
  ): Promise<{ message: string }> {
    // `updateMany` idempotente: se ja estava deletada, retorna count=0 sem
    // erro. 200 estilo Hoppe (HPP-050) sempre que a task for do workspace.
    const existing = await this.repository.findExistenceRow(
      workspaceId,
      taskId,
    );
    if (!existing) {
      throw new NotFoundException('Task nao encontrada');
    }
    await this.repository.softDelete(workspaceId, taskId);
    return { message: 'Task removida' };
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
      const rows = await this.repository.findParentsForCycleCheck(frontier, tx);
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

  /**
   * Resolve o `markdownContent` final do create considerando o template
   * vinculado ao `customTypeId` (TTT-032).
   *
   * Regras de aplicacao (todas devem ser true para sobrescrever):
   *   1. Flag `FEATURE_TASK_TYPE_TEMPLATES_ENABLED` esta ON.
   *   2. `customTypeId` foi informado pelo cliente.
   *   3. `taskTypeTemplatesRepository` esta disponivel (modulo wireado).
   *   4. Template existe e visivel ao workspace (cross-tenant 404 retorna null).
   *   5. Template tem `defaultDescriptionBlocks` nao-vazio.
   *   6. Cliente nao informou `markdownContent` — ou informou apenas conteudo
   *      vazio (string em branco ou AST com paragrafos vazios).
   *
   * Em qualquer outro caso, retorna o valor original `dto.markdownContent`
   * (ou `null` quando undefined). Comportamento sem template e identico ao
   * fluxo legado, garantindo regressao zero (Sprint AC).
   */
  private async resolveMarkdownContentWithTemplate(
    tx: Prisma.TransactionClient,
    clientMarkdown: string | undefined,
    customTypeId: string | undefined,
    workspaceId: string,
  ): Promise<{ markdown: string | null; templateApplied: boolean }> {
    const fallback = clientMarkdown ?? null;

    // Cliente passou descricao nao-vazia: respeita o input e nao toca template
    // (princio "user input wins" — alinhado a §"Manutenibilidade" do PLANO).
    if (clientMarkdown !== undefined && !this.isEmptyMarkdown(clientMarkdown)) {
      return { markdown: fallback, templateApplied: false };
    }

    // Sem customTypeId nao ha template a resolver.
    if (!customTypeId) {
      return { markdown: fallback, templateApplied: false };
    }

    // Modulo nao wireado (testes legados) ou flag OFF: fluxo legado.
    if (!this.taskTypeTemplatesRepository || !this.isTemplatesEnabled()) {
      return { markdown: fallback, templateApplied: false };
    }

    // Leitura best-effort dentro da `tx` — em caso de falha (FK ausente,
    // Prisma client nao gerado em test, etc.) caimos no fluxo legado para
    // nao bloquear o create. Erros sao logados em nivel `warn`.
    try {
      const template =
        await this.taskTypeTemplatesRepository.findByCustomTaskTypeId(
          customTypeId,
          workspaceId,
        );
      if (!template) return { markdown: fallback, templateApplied: false };
      const blocks = template.defaultDescriptionBlocks;
      if (blocks === null || blocks === undefined) {
        // Template existe mas nao tem defaultDescriptionBlocks. Ainda conta
        // como instanciacao (TTT-050) para refletir uso do template no
        // create — outros side-effects (categorias de anexo) sao consumidos
        // pelo frontend usando o GET de templates separadamente.
        return { markdown: fallback, templateApplied: true };
      }
      // Serializa o AST como JSON. O frontend (M4) sabe parsear esta string
      // de volta para BlockNote — espelha o contrato `bodyBlocks` ja em
      // task-comments. Mantem `markdownContent` como String no banco
      // (zero ALTER em WorkItem — instrucao do PLANO §Decisoes-Chave D2).
      return { markdown: JSON.stringify(blocks), templateApplied: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(
        `tasks.create: falha ao resolver template ` +
          `(customTypeId=${customTypeId} ws=${workspaceId}): ${msg}`,
      );
      return { markdown: fallback, templateApplied: false };
    }
  }

  /** Le a flag de templates do `ConfigService` (default OFF se ausente). */
  private isTemplatesEnabled(): boolean {
    if (!this.config) return false;
    const value = this.config.get<boolean | string>(
      'FEATURE_TASK_TYPE_TEMPLATES_ENABLED',
      false,
    );
    return value === true || value === 'true';
  }

  /**
   * Heuristica para identificar `markdownContent` "vazio". Cobre:
   *   - string vazia ou whitespace.
   *   - JSON-stringified BlockNote AST com somente paragrafos vazios
   *     (e.g., `[{"type":"paragraph","content":[]}]`).
   *
   * Se nao for parseavel como JSON, fallback para verificacao de string
   * (se nao tem caracteres alfanumericos -> vazio).
   */
  private isEmptyMarkdown(value: string): boolean {
    const trimmed = value.trim();
    if (trimmed.length === 0) return true;

    // Tenta parsear como JSON BlockNote AST.
    try {
      const parsed: unknown = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.every((b) => this.isEmptyBlock(b));
      }
      if (
        typeof parsed === 'object' &&
        parsed !== null &&
        'content' in (parsed as Record<string, unknown>) &&
        Array.isArray((parsed as { content: unknown[] }).content)
      ) {
        return (parsed as { content: unknown[] }).content.every((b) =>
          this.isEmptyBlock(b),
        );
      }
      // JSON valido mas estrutura inesperada — assume nao-vazio (respeita input).
      return false;
    } catch {
      // Nao e JSON: trata como markdown plano. So considera vazio se nao
      // sobrar nada apos trim — ja coberto acima (return false aqui).
      return false;
    }
  }

  /** Determina se um bloco BlockNote e visualmente vazio (sem texto). */
  private isEmptyBlock(block: unknown): boolean {
    if (typeof block !== 'object' || block === null) return true;
    const obj = block as { type?: unknown; content?: unknown };
    // Paragrafo vazio: content ausente ou array sem entradas com texto.
    if (obj.type === 'paragraph' || obj.type === undefined) {
      const content = obj.content;
      if (content === undefined || content === null) return true;
      if (!Array.isArray(content) || content.length === 0) return true;
      return content.every((node) => {
        if (typeof node !== 'object' || node === null) return true;
        const text = (node as { text?: unknown }).text;
        return typeof text !== 'string' || text.trim().length === 0;
      });
    }
    return false;
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
