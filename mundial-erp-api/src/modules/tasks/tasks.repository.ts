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
  listId: true,
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
  assignees: {
    select: {
      userId: true,
      isPrimary: true,
      user: { select: { name: true } },
    },
    orderBy: [{ isPrimary: 'desc' }, { assignedAt: 'asc' }],
  },
  customType: {
    select: {
      id: true,
      name: true,
      namePlural: true,
      icon: true,
      color: true,
      workspaceId: true,
      isBuiltin: true,
    },
  },
  status: {
    select: {
      id: true,
      name: true,
      type: true,
      color: true,
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
    list: { space: { workspaceId } },
    deletedAt: null,
  };

  const listIds = filters.listIds ?? filters.processIds;
  const folderIds = filters.folderIds ?? filters.areaIds;
  const spaceIds = filters.spaceIds ?? filters.departmentIds;
  if (listIds?.length) {
    where.listId = { in: listIds };
  }
  if (folderIds?.length) {
    where.list = {
      ...(where.list as Prisma.ListWhereInput),
      folderId: { in: folderIds },
    };
  }
  if (spaceIds?.length) {
    where.list = {
      ...(where.list as Prisma.ListWhereInput),
      space: { workspaceId, id: { in: spaceIds } },
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
          type: true,
          color: true,
        },
      },
      customType: {
        select: {
          id: true,
          name: true,
          namePlural: true,
          icon: true,
          color: true,
          workspaceId: true,
          isBuiltin: true,
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
        list: { space: { workspaceId } },
      },
      include,
    });
  }

  /** Carrega assignees (join) com user embedded. Aceita `tx` opcional. */
  async findAssignees(taskId: string, tx?: Prisma.TransactionClient) {
    return this.client(tx).workItemAssignee.findMany({
      where: { workItemId: taskId },
      select: {
        userId: true,
        isPrimary: true,
        assignedAt: true,
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: [{ isPrimary: 'desc' }, { assignedAt: 'asc' }],
    });
  }

  /** IDs dos assignees atuais para diff transacional (HPP-056 race fix). */
  async findAssigneeIds(
    taskId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<string[]> {
    const rows = await this.client(tx).workItemAssignee.findMany({
      where: { workItemId: taskId },
      select: { userId: true },
    });
    return rows.map((r) => r.userId);
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
        list: { space: { workspaceId } },
      },
      select: {
        id: true,
        archived: true,
        deletedAt: true,
        listId: true,
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
        list: { space: { workspaceId } },
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
        list: { space: { workspaceId } },
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
        list: { space: { workspaceId } },
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
   * Assert-only: retorna `{ id, spaceId }` se o process pertence ao
   * workspace (via `department.workspaceId`). Usado em `create` para 404
   * cross-tenant cedo (PLANO §7.2, §8.1). Espelha o padrao ja estabelecido
   * em `TaskTemplatesRepository.findProcessInWorkspace`.
   */
  async findProcessInWorkspace(
    workspaceId: string,
    listId: string,
    tx?: Prisma.TransactionClient,
  ) {
    return this.client(tx).list.findFirst({
      where: {
        id: listId,
        deletedAt: null,
        space: { workspaceId },
      },
      select: { id: true, spaceId: true },
    });
  }

  /**
   * Primeiro `Status` com `type=NOT_STARTED` do departamento do
   * process. Usado quando o caller de `create` nao informa `statusId`.
   * Budget: 2 queries (process -> department, status).
   */
  async findFirstStatusForProcess(
    listId: string,
    tx?: Prisma.TransactionClient,
  ) {
    const db = this.client(tx);
    const process = await db.list.findUnique({
      where: { id: listId },
      select: { spaceId: true },
    });
    if (!process?.spaceId) return null;
    return db.status.findFirst({
      where: {
        spaceId: process.spaceId,
        type: 'NOT_STARTED',
        deletedAt: null,
      },
      orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
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
      listId: string;
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
      listId: input.listId,
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
        list: { space: { workspaceId } },
      },
      select: { id: true },
    });
    return rows.map((r) => r.id);
  }

  /**
   * HPP-056 — Carrega `creatorId` da task (alem do existence guard) para o
   * fallback "lista vazia recoloca creator". Tenant via `space.workspaceId`.
   */
  async findAssignContext(workspaceId: string, taskId: string) {
    return this.prisma.workItem.findFirst({
      where: {
        id: taskId,
        deletedAt: null,
        list: { space: { workspaceId } },
      },
      select: { id: true, creatorId: true, listId: true },
    });
  }

  /**
   * HPP-054 — `GET /tasks/:id/subtasks`. Retorna tasks filhas
   * (parentId = :id) ativas. Indice `idx_work_items_parent`.
   */
  async findSubtasks(workspaceId: string, parentId: string, take: number) {
    return this.prisma.workItem.findMany({
      where: {
        parentId,
        deletedAt: null,
        list: {
          OR: [
            { space: { workspaceId } },
            { folder: { space: { workspaceId } } },
          ],
        },
      },
      select: TASK_LIST_SELECT,
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      take,
    });
  }

  /**
   * HPP-053 — `GET /tasks/my-tasks`. Retorna tasks atribuidas ao usuario
   * dentro do workspace, ativas (nao arquivadas / nao deletadas). O service
   * distribui em buckets temporais. Hard cap `take: 1000`.
   */
  async findMyTasks(workspaceId: string, userId: string, take: number) {
    return this.prisma.workItem.findMany({
      where: {
        deletedAt: null,
        archived: false,
        assignees: { some: { userId } },
        list: {
          OR: [
            { space: { workspaceId } },
            { folder: { space: { workspaceId } } },
          ],
        },
      },
      select: TASK_LIST_SELECT,
      orderBy: [{ dueDate: 'asc' }, { sortOrder: 'asc' }],
      take,
    });
  }

  /**
   * HPP-052 — Tasks por escopo `list|folder|space`. Single query com filtro
   * Prisma traduzindo o nivel para `list.id|list.folderId|list.spaceId`.
   * Tenant isolation via `space.workspaceId` em todos os ramos.
   */
  async findByScope(
    workspaceId: string,
    scope: { level: 'list' | 'folder' | 'space'; id: string },
    take: number,
  ) {
    const where: Prisma.WorkItemWhereInput = { deletedAt: null };
    if (scope.level === 'list') {
      where.listId = scope.id;
      where.list = {
        OR: [
          { space: { workspaceId } },
          { folder: { space: { workspaceId } } },
        ],
      };
    } else if (scope.level === 'folder') {
      where.list = {
        folderId: scope.id,
        folder: { space: { workspaceId } },
      };
    } else {
      where.list = {
        OR: [
          { spaceId: scope.id, space: { workspaceId } },
          { folder: { spaceId: scope.id, space: { workspaceId } } },
        ],
      };
    }
    return this.prisma.workItem.findMany({
      where,
      select: TASK_LIST_SELECT,
      orderBy: [{ statusId: 'asc' }, { sortOrder: 'asc' }],
      take,
    });
  }

  /**
   * HPP-052 — Statuses elegiveis ao escopo. Inclui statuses do space e os
   * do folder (se aplicavel). Tenant isolation via `space.workspaceId`.
   */
  async findStatusesForScope(
    workspaceId: string,
    scope: {
      level: 'list' | 'folder' | 'space';
      id: string;
      spaceId: string;
      folderId: string | null;
    },
  ) {
    const where = await this.resolveStatusWhere(workspaceId, scope);
    return this.prisma.status.findMany({
      where,
      select: {
        id: true,
        name: true,
        color: true,
        type: true,
        position: true,
      },
      orderBy: { position: 'asc' },
    });
  }

  private async resolveStatusWhere(
    workspaceId: string,
    scope: {
      level: 'list' | 'folder' | 'space';
      id: string;
      spaceId: string;
      folderId: string | null;
    },
  ): Promise<Prisma.StatusWhereInput> {
    const base: Prisma.StatusWhereInput = {
      deletedAt: null,
      OR: [
        { space: { workspaceId } },
        { folder: { space: { workspaceId } } },
        {
          list: {
            OR: [
              { space: { workspaceId } },
              { folder: { space: { workspaceId } } },
            ],
          },
        },
      ],
    };

    if (scope.level === 'list') {
      const list = await this.prisma.list.findUnique({
        where: { id: scope.id },
        select: {
          spaceId: true,
          folderId: true,
          statusInheritance: true,
          folder: {
            select: { spaceId: true, statusInheritance: true },
          },
        },
      });
      if (!list) return { ...base, listId: scope.id };
      if (list.statusInheritance === 'CUSTOM') {
        return { ...base, listId: scope.id };
      }
      if (list.statusInheritance === 'SPACE') {
        return {
          ...base,
          spaceId: list.spaceId,
          folderId: null,
          listId: null,
        };
      }
      const folder = list.folder;
      if (folder && folder.statusInheritance === 'CUSTOM' && list.folderId) {
        return { ...base, folderId: list.folderId, listId: null };
      }
      const spaceId = folder?.spaceId ?? list.spaceId;
      return { ...base, spaceId, folderId: null, listId: null };
    }

    if (scope.level === 'folder') {
      const folder = await this.prisma.folder.findUnique({
        where: { id: scope.id },
        select: { spaceId: true, statusInheritance: true },
      });
      if (folder?.statusInheritance === 'CUSTOM') {
        return { ...base, folderId: scope.id, listId: null };
      }
      return {
        ...base,
        spaceId: folder?.spaceId ?? scope.spaceId,
        folderId: null,
        listId: null,
      };
    }

    return {
      ...base,
      spaceId: scope.spaceId,
      folderId: null,
      listId: null,
    };
  }

  /**
   * HPP-051 — Tasks de um space agrupadas por list. Single query com OR
   * cobrindo lista direta (`list.spaceId`) e lista em folder
   * (`list.folder.spaceId`). Tenant isolation via `space.workspaceId` em
   * ambos os ramos. Limite duro `take: 500` evita dataset ilimitado.
   */
  async findBySpaceGrouped(
    workspaceId: string,
    spaceId: string,
    take: number,
  ) {
    return this.prisma.workItem.findMany({
      where: {
        deletedAt: null,
        OR: [
          { list: { spaceId, space: { workspaceId } } },
          { list: { folder: { spaceId, space: { workspaceId } } } },
        ],
      },
      select: {
        ...TASK_LIST_SELECT,
        list: {
          select: {
            id: true,
            name: true,
            folder: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: [{ listId: 'asc' }, { sortOrder: 'asc' }],
      take,
    });
  }
}
