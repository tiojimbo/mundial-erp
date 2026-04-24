import { Injectable } from '@nestjs/common';
import { Prisma, TaskPriority } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { TaskFiltersDto } from './dtos/task-filters.dto';

/**
 * Projecao sumarizada usada por `GET /tasks` — `select` explicito para
 * atender CTO note #4 (nunca `include:true`) e controlar o payload.
 */
export const TASK_LIST_SELECT = {
  id: true,
  processId: true,
  title: true,
  description: true,
  statusId: true,
  itemType: true,
  priority: true,
  primaryAssigneeCache: true,
  creatorId: true,
  parentId: true,
  startDate: true,
  dueDate: true,
  completedAt: true,
  closedAt: true,
  estimatedMinutes: true,
  trackedMinutes: true,
  sortOrder: true,
  archived: true,
  archivedAt: true,
  customTypeId: true,
  points: true,
  timeSpentSeconds: true,
  createdAt: true,
  updatedAt: true,
  status: {
    select: {
      id: true,
      name: true,
      category: true,
      color: true,
      icon: true,
    },
  },
} satisfies Prisma.WorkItemSelect;

/**
 * Builder de filtros Prisma. `workspaceId` SEMPRE na primeira linha do where
 * via `process.department.workspaceId` (defesa em profundidade §8.1).
 */
function buildWhere(
  workspaceId: string,
  filters: TaskFiltersDto,
): Prisma.WorkItemWhereInput {
  const where: Prisma.WorkItemWhereInput = {
    // 1a linha: tenant isolation.
    process: { department: { workspaceId } },
    deletedAt: null,
  };

  if (filters.processIds?.length) {
    where.processId = { in: filters.processIds };
  }
  if (filters.areaIds?.length) {
    where.process = {
      ...(where.process as Prisma.ProcessWhereInput),
      areaId: { in: filters.areaIds },
    };
  }
  if (filters.departmentIds?.length) {
    where.process = {
      ...(where.process as Prisma.ProcessWhereInput),
      department: { workspaceId, id: { in: filters.departmentIds } },
    };
  }
  if (filters.statuses?.length) {
    where.statusId = { in: filters.statuses };
  }
  if (filters.assigneeIds?.length) {
    // OR: assignee primario (cache) OU participa do join de assignees.
    where.OR = [
      { primaryAssigneeCache: { in: filters.assigneeIds } },
      { assignees: { some: { userId: { in: filters.assigneeIds } } } },
    ];
  }
  if (filters.tagIds?.length) {
    where.tags = { some: { tagId: { in: filters.tagIds } } };
  }
  if (filters.customTypeIds?.length) {
    where.customTypeId = { in: filters.customTypeIds };
  }
  if (filters.priority?.length) {
    where.priority = { in: filters.priority as TaskPriority[] };
  }
  if (filters.archived === true) {
    where.archived = true;
  } else if (filters.archived === false) {
    where.archived = false;
  }
  if (!filters.includeClosed) {
    where.closedAt = null;
  }
  if (filters.parentId !== undefined) {
    where.parentId = filters.parentId;
  }
  if (filters.search) {
    where.AND = [
      ...((where.AND as Prisma.WorkItemWhereInput[]) ?? []),
      {
        OR: [
          { title: { contains: filters.search, mode: 'insensitive' } },
          { description: { contains: filters.search, mode: 'insensitive' } },
        ],
      },
    ];
  }
  if (filters.dueDateGt || filters.dueDateLt) {
    where.dueDate = {
      ...(filters.dueDateGt ? { gte: new Date(filters.dueDateGt) } : {}),
      ...(filters.dueDateLt ? { lte: new Date(filters.dueDateLt) } : {}),
    };
  }
  if (filters.createdGt || filters.createdLt) {
    where.createdAt = {
      ...(filters.createdGt ? { gte: new Date(filters.createdGt) } : {}),
      ...(filters.createdLt ? { lte: new Date(filters.createdLt) } : {}),
    };
  }
  if (filters.updatedGt || filters.updatedLt) {
    where.updatedAt = {
      ...(filters.updatedGt ? { gte: new Date(filters.updatedGt) } : {}),
      ...(filters.updatedLt ? { lte: new Date(filters.updatedLt) } : {}),
    };
  }

  return where;
}

function buildOrderBy(
  filters: TaskFiltersDto,
): Prisma.WorkItemOrderByWithRelationInput[] {
  const dir: Prisma.SortOrder = filters.direction === 'asc' ? 'asc' : 'desc';
  const field = filters.orderBy;
  // `id` e desempate estavel para cursor pagination (CTO note §13).
  if (field === 'id') {
    return [{ id: dir }];
  }
  return [{ [field]: dir } as Prisma.WorkItemOrderByWithRelationInput, { id: dir }];
}

@Injectable()
export class TasksRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Cliente para ler/escrever dentro de uma transacao. Cai no `this.prisma`
   * quando `tx` nao e informado. Padrao que mantem service fora de Prisma.
   */
  private client(tx?: Prisma.TransactionClient) {
    return tx ?? this.prisma;
  }

  /**
   * Lista workspace-wide com filtros. Paginacao dupla:
   * - `cursor` opaco (id da ultima linha visivel): usa `id {lt|gt} cursor`
   *   + `take: limit+1` para detectar `hasMore` sem um COUNT extra.
   * - fallback offset `page`+`limit`: usa `skip` e COUNT separado.
   *
   * Retorna `items` + `total` + `hasMore` + `nextCursor`.
   * Budget: 2 queries (1 find + 1 count — em cursor mode o count continua
   * sendo executado para manter contrato meta.total no envelope).
   */
  async findMany(workspaceId: string, filters: TaskFiltersDto) {
    const where = buildWhere(workspaceId, filters);
    const orderBy = buildOrderBy(filters);
    const take = filters.limit;

    if (filters.cursor) {
      // Cursor mode: compara `id` segundo a direcao — `desc` default `lt`,
      // `asc` usa `gt`. Mesmo quando `orderBy` e outro campo, o desempate
      // estavel pelo `id` em `buildOrderBy` garante que esta restricao e
      // monotonamente consistente com a ordenacao.
      const cursorOp: Prisma.StringFilter =
        filters.direction === 'asc'
          ? { gt: filters.cursor }
          : { lt: filters.cursor };
      const cursoredWhere: Prisma.WorkItemWhereInput = {
        AND: [where, { id: cursorOp }],
      };

      const [peeked, total] = await Promise.all([
        this.prisma.workItem.findMany({
          where: cursoredWhere,
          orderBy,
          take: take + 1,
          select: TASK_LIST_SELECT,
        }),
        this.prisma.workItem.count({ where }),
      ]);

      const hasMore = peeked.length > take;
      const items = hasMore ? peeked.slice(0, take) : peeked;
      const nextCursor =
        hasMore && items.length > 0 ? items[items.length - 1].id : null;
      return { items, total, hasMore, nextCursor };
    }

    const [items, total] = await Promise.all([
      this.prisma.workItem.findMany({
        where,
        orderBy,
        take,
        skip: filters.skip,
        select: TASK_LIST_SELECT,
      }),
      this.prisma.workItem.count({ where }),
    ]);

    const hasMore = items.length === take && filters.skip + take < total;
    const nextCursor =
      hasMore && items.length > 0 ? items[items.length - 1].id : null;
    return { items, total, hasMore, nextCursor };
  }

  /**
   * Detalhe de uma task. Includes aplicados conforme whitelist (pipe valida).
   * Budget: 1 query principal + 1 assignees + 1 watchers (se solicitados).
   */
  async findById(
    workspaceId: string,
    taskId: string,
    includes: ReadonlySet<string>,
  ) {
    const include: Prisma.WorkItemInclude = {
      status: {
        select: {
          id: true,
          name: true,
          category: true,
          color: true,
          icon: true,
        },
      },
    };

    if (includes.has('subtasks')) {
      include.children = {
        where: { deletedAt: null },
        select: TASK_LIST_SELECT,
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      };
    }
    if (includes.has('checklists')) {
      include.checklists = {
        where: { deletedAt: null },
        orderBy: { position: 'asc' },
      };
    }
    if (includes.has('dependencies')) {
      include.dependenciesOut = true;
      include.dependenciesIn = true;
    }
    if (includes.has('links')) {
      include.linksFrom = true;
      include.linksTo = true;
    }
    if (includes.has('tags')) {
      include.tags = {
        include: {
          tag: {
            select: { id: true, name: true, color: true, bgColor: true },
          },
        },
      };
    }
    if (includes.has('attachments')) {
      include.attachments = {
        where: { deletedAt: null },
        orderBy: { createdAt: 'desc' },
      };
    }

    return this.prisma.workItem.findFirst({
      where: {
        id: taskId,
        deletedAt: null,
        process: { department: { workspaceId } },
      },
      include,
    });
  }

  /** Carrega assignees (join) com user embedded. */
  async findAssignees(taskId: string) {
    return this.prisma.workItemAssignee.findMany({
      where: { workItemId: taskId },
      select: {
        userId: true,
        isPrimary: true,
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: [{ isPrimary: 'desc' }, { assignedAt: 'asc' }],
    });
  }

  /** Carrega watchers (join) com user embedded. */
  async findWatchers(taskId: string) {
    return this.prisma.workItemWatcher.findMany({
      where: { workItemId: taskId },
      select: {
        userId: true,
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { addedAt: 'asc' },
    });
  }

  /** Existencia crua para guards de rota (return `null` = 404 downstream). */
  async findExistenceRow(workspaceId: string, taskId: string) {
    return this.prisma.workItem.findFirst({
      where: {
        id: taskId,
        process: { department: { workspaceId } },
      },
      select: {
        id: true,
        archived: true,
        deletedAt: true,
        processId: true,
        statusId: true,
        mergedIntoId: true,
      },
    });
  }

  /**
   * Update parcial com `tx` opcional — quando caller abriu `$transaction`,
   * passa o client transacional para manter atomicidade sem vazar Prisma
   * para dentro do service.
   */
  async update(
    taskId: string,
    data: Prisma.WorkItemUncheckedUpdateInput,
    tx?: Prisma.TransactionClient,
  ) {
    return this.client(tx).workItem.update({
      where: { id: taskId },
      data,
      select: TASK_LIST_SELECT,
    });
  }

  /** Recarrega pelo select padrao — util apos update de colecoes sem campos escalares. */
  async findBySelect(
    taskId: string,
    tx?: Prisma.TransactionClient,
  ) {
    return this.client(tx).workItem.findUniqueOrThrow({
      where: { id: taskId },
      select: TASK_LIST_SELECT,
    });
  }

  /**
   * Leitura minima usada pelo `diffWorkItem` (helpers/diff-work-item.ts) — 9
   * campos semanticamente relevantes para o activity feed (ADR-002). Filtro
   * `workspaceId` transitivo via `process.department` (cross-tenant 404).
   * Aceita `tx` para compartilhar a leitura com a `$transaction` do service.
   */
  async findForDiff(
    workspaceId: string,
    taskId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<{
    id: string;
    title: string;
    description: string | null;
    markdownContent: string | null;
    statusId: string;
    priority: TaskPriority;
    dueDate: Date | null;
    startDate: Date | null;
    points: number | null;
    archived: boolean;
    customTypeId: string | null;
  } | null> {
    const row = await this.client(tx).workItem.findFirst({
      where: {
        id: taskId,
        deletedAt: null,
        process: { department: { workspaceId } },
      },
      select: {
        id: true,
        title: true,
        description: true,
        markdownContent: true,
        statusId: true,
        priority: true,
        dueDate: true,
        startDate: true,
        points: true,
        archived: true,
        customTypeId: true,
      },
    });
    if (!row) return null;
    return {
      ...row,
      points: row.points === null ? null : Number(row.points),
    };
  }

  /** Soft delete idempotente (`deletedAt := now()` sem erro se ja deletado). */
  async softDelete(
    workspaceId: string,
    taskId: string,
    tx?: Prisma.TransactionClient,
  ) {
    await this.client(tx).workItem.updateMany({
      where: {
        id: taskId,
        deletedAt: null,
        process: { department: { workspaceId } },
      },
      data: { deletedAt: new Date() },
    });
  }

  async setArchived(
    taskId: string,
    archived: boolean,
    tx?: Prisma.TransactionClient,
  ) {
    return this.client(tx).workItem.update({
      where: { id: taskId },
      data: {
        archived,
        archivedAt: archived ? new Date() : null,
      },
      select: TASK_LIST_SELECT,
    });
  }

  // ---------- Merge helpers (PLANO §8.4) ----------
  // Todas as primitivas de persistencia do merge ficam aqui para que o
  // service permaneca puramente orquestracao + outbox.

  /** Carrega target + sources com os campos minimos para o merge. */
  async findForMerge(
    workspaceId: string,
    ids: string[],
    tx: Prisma.TransactionClient,
  ) {
    return tx.workItem.findMany({
      where: {
        id: { in: ids },
        process: { department: { workspaceId } },
      },
      select: {
        id: true,
        parentId: true,
        mergedIntoId: true,
        timeSpentSeconds: true,
        trackedMinutes: true,
        deletedAt: true,
      },
    });
  }

  /** Resolve o proximo frontier de parents para BFS de merge-cycle. */
  async findParentsForCycleCheck(
    ids: string[],
    tx: Prisma.TransactionClient,
  ) {
    return tx.workItem.findMany({
      where: { id: { in: ids } },
      select: { id: true, parentId: true },
    });
  }

  /**
   * Move checklists/attachments/comments/status_history das sources para o
   * target numa unica transacao — `updateMany` usa filtro `in` (batch).
   */
  async moveChildCollectionsToTarget(
    sourceIds: string[],
    targetId: string,
    tx: Prisma.TransactionClient,
  ) {
    await tx.workItemChecklist.updateMany({
      where: { workItemId: { in: sourceIds } },
      data: { workItemId: targetId },
    });
    await tx.workItemAttachment.updateMany({
      where: { workItemId: { in: sourceIds } },
      data: { workItemId: targetId },
    });
    await tx.workItemComment.updateMany({
      where: { workItemId: { in: sourceIds } },
      data: { workItemId: targetId },
    });
  }

  /** Une tags das sources no target via raw SQL com dedup `ON CONFLICT`. */
  async unionTagLinksToTarget(
    sourceIds: string[],
    targetId: string,
    tx: Prisma.TransactionClient,
  ) {
    await tx.$executeRaw`
      INSERT INTO work_item_tag_links (work_item_id, tag_id)
      SELECT ${targetId}, src.tag_id
      FROM work_item_tag_links src
      WHERE src.work_item_id = ANY(${sourceIds}::text[])
      ON CONFLICT (work_item_id, tag_id) DO NOTHING
    `;
  }

  /** Acumula seconds/minutes no target via `increment`. */
  async incrementTotalsOnTarget(
    targetId: string,
    seconds: number,
    minutes: number,
    tx: Prisma.TransactionClient,
  ) {
    if (seconds <= 0 && minutes <= 0) return;
    await tx.workItem.update({
      where: { id: targetId },
      data: {
        timeSpentSeconds: { increment: seconds },
        trackedMinutes: { increment: minutes },
      },
      select: { id: true },
    });
  }

  /** Finaliza sources: mergedIntoId + archived + deletedAt numa unica query. */
  async markSourcesMerged(
    sourceIds: string[],
    targetId: string,
    now: Date,
    tx: Prisma.TransactionClient,
  ) {
    await tx.workItem.updateMany({
      where: { id: { in: sourceIds } },
      data: {
        mergedIntoId: targetId,
        archived: true,
        archivedAt: now,
        deletedAt: now,
      },
    });
  }

  /**
   * Agregado de tempo por status (PLANO-TASKS.md §7.1 time-in-status).
   * Retorna linhas abertas (`leftAt=null`) e fechadas para calculo no service.
   * Budget: 1 query.
   */
  async findStatusHistory(taskId: string) {
    return this.prisma.workItemStatusHistory.findMany({
      where: { workItemId: taskId },
      orderBy: { enteredAt: 'asc' },
      select: {
        statusId: true,
        enteredAt: true,
        leftAt: true,
        durationSeconds: true,
      },
    });
  }

  /** Bulk dos historicos para `time-in-status:bulk`. Budget: 1 query. */
  async findStatusHistoryForMany(taskIds: string[]) {
    return this.prisma.workItemStatusHistory.findMany({
      where: { workItemId: { in: taskIds } },
      orderBy: { enteredAt: 'asc' },
      select: {
        workItemId: true,
        statusId: true,
        enteredAt: true,
        leftAt: true,
        durationSeconds: true,
      },
    });
  }

  /**
   * Assert-only: retorna `{ id, departmentId }` se o process pertence ao
   * workspace (via `department.workspaceId`). Usado em `create` para 404
   * cross-tenant cedo (PLANO §7.2, §8.1). Espelha o padrao ja estabelecido
   * em `TaskTemplatesRepository.findProcessInWorkspace`.
   */
  async findProcessInWorkspace(
    workspaceId: string,
    processId: string,
    tx?: Prisma.TransactionClient,
  ) {
    return this.client(tx).process.findFirst({
      where: {
        id: processId,
        deletedAt: null,
        department: { workspaceId },
      },
      select: { id: true, departmentId: true },
    });
  }

  /**
   * Primeiro `WorkflowStatus` com `category=NOT_STARTED` do departamento do
   * process. Usado quando o caller de `create` nao informa `statusId`.
   * Budget: 2 queries (process -> department, workflow_status).
   */
  async findFirstStatusForProcess(
    processId: string,
    tx?: Prisma.TransactionClient,
  ) {
    const db = this.client(tx);
    const process = await db.process.findUnique({
      where: { id: processId },
      select: { departmentId: true },
    });
    if (!process?.departmentId) return null;
    return db.workflowStatus.findFirst({
      where: {
        departmentId: process.departmentId,
        category: 'NOT_STARTED',
        deletedAt: null,
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      select: { id: true },
    });
  }

  /**
   * Cria uma task (WorkItem) dentro da `tx` fornecida. ADR-001:
   * `primaryAssigneeCache` NAO e escrito aqui — a Prisma extension recalcula
   * quando as linhas de `work_item_assignees` forem inseridas pelo
   * `AssigneesSyncService` em sequencia.
   */
  async createTask(
    tx: Prisma.TransactionClient,
    input: {
      processId: string;
      title: string;
      description?: string | null;
      markdownContent?: string | null;
      statusId: string;
      priority?: TaskPriority;
      dueDate?: Date | null;
      startDate?: Date | null;
      estimatedMinutes?: number | null;
      points?: number | null;
      customTypeId?: string | null;
      parentId?: string | null;
      creatorId: string;
    },
  ) {
    const data: Prisma.WorkItemUncheckedCreateInput = {
      processId: input.processId,
      title: input.title,
      statusId: input.statusId,
      creatorId: input.creatorId,
    };
    if (input.description !== undefined) data.description = input.description;
    if (input.markdownContent !== undefined)
      data.markdownContent = input.markdownContent;
    if (input.priority !== undefined) data.priority = input.priority;
    if (input.dueDate !== undefined) data.dueDate = input.dueDate;
    if (input.startDate !== undefined) data.startDate = input.startDate;
    if (input.estimatedMinutes !== undefined)
      data.estimatedMinutes = input.estimatedMinutes;
    if (input.points !== undefined && input.points !== null)
      data.points = new Prisma.Decimal(input.points);
    if (input.customTypeId !== undefined)
      data.customTypeId = input.customTypeId;
    if (input.parentId !== undefined) data.parentId = input.parentId;

    return tx.workItem.create({
      data,
      select: TASK_LIST_SELECT,
    });
  }

  /**
   * Valida que todos os ids fornecidos pertencem ao workspace (proteccao
   * cross-tenant pos-validacao do body). Retorna os ids validos — o service
   * decide se diff = vazio -> 404.
   */
  async assertBelongsToWorkspace(
    workspaceId: string,
    taskIds: string[],
  ): Promise<string[]> {
    if (taskIds.length === 0) return [];
    const rows = await this.prisma.workItem.findMany({
      where: {
        id: { in: taskIds },
        process: { department: { workspaceId } },
      },
      select: { id: true },
    });
    return rows.map((r) => r.id);
  }
}
