/**
 * TaskTemplatesRepository — PLANO-TASKS.md §7.3 / §8.9.
 *
 * Todas as queries partem do `workspaceId` para cross-tenant isolation.
 * O `WorkItemTemplate` carrega o `workspaceId` como coluna propria, entao
 * nao precisamos do `process.department.workspaceId` hop que outros modulos
 * de tasks usam. Isso barateia os lookups do modulo.
 *
 * As funcoes opcionalmente aceitam um `Prisma.TransactionClient` para uso
 * dentro de `$transaction` (caso do `instantiate`).
 */

import { Injectable } from '@nestjs/common';
import { Prisma, TaskTemplateScope } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

export const TEMPLATE_SELECT = {
  id: true,
  workspaceId: true,
  name: true,
  scope: true,
  departmentId: true,
  processId: true,
  payload: true,
  subtaskCount: true,
  checklistCount: true,
  createdBy: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
} as const;

export interface TemplateFindManyParams {
  skip?: number;
  take?: number;
  scope?: TaskTemplateScope;
  departmentId?: string;
  processId?: string;
  search?: string;
}

export interface CreateTemplateData {
  workspaceId: string;
  name: string;
  scope: TaskTemplateScope;
  departmentId: string | null;
  processId: string | null;
  payload: Prisma.InputJsonValue;
  subtaskCount: number;
  checklistCount: number;
  createdBy: string | null;
}

export interface UpdateTemplateData {
  name?: string;
  scope?: TaskTemplateScope;
  departmentId?: string | null;
  processId?: string | null;
  payload?: Prisma.InputJsonValue;
  subtaskCount?: number;
  checklistCount?: number;
}

type Db = PrismaService | Prisma.TransactionClient;

@Injectable()
export class TaskTemplatesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findMany(workspaceId: string, params: TemplateFindManyParams) {
    const {
      skip = 0,
      take = 20,
      scope,
      departmentId,
      processId,
      search,
    } = params;

    const where: Prisma.WorkItemTemplateWhereInput = {
      workspaceId,
      deletedAt: null,
    };

    if (scope) where.scope = scope;
    if (departmentId) where.departmentId = departmentId;
    if (processId) where.processId = processId;
    if (search && search.length > 0) {
      where.name = { contains: search, mode: 'insensitive' };
    }

    const [items, total] = await Promise.all([
      this.prisma.workItemTemplate.findMany({
        where,
        skip,
        take,
        orderBy: [{ name: 'asc' }],
        select: TEMPLATE_SELECT,
      }),
      this.prisma.workItemTemplate.count({ where }),
    ]);

    return { items, total };
  }

  async findById(
    workspaceId: string,
    id: string,
    tx?: Prisma.TransactionClient,
  ) {
    const db: Db = tx ?? this.prisma;
    return db.workItemTemplate.findFirst({
      where: { id, workspaceId, deletedAt: null },
      select: TEMPLATE_SELECT,
    });
  }

  /**
   * Mesma logica de `findById` porem retorna o payload como JSON. Mantido
   * separado por simetria com o resto do modulo — o `select` ja inclui o
   * payload hoje, mas a intencao e explicitar quando o caller depende dele.
   */
  async findWithPayload(
    workspaceId: string,
    id: string,
    tx?: Prisma.TransactionClient,
  ) {
    return this.findById(workspaceId, id, tx);
  }

  async create(data: CreateTemplateData, tx?: Prisma.TransactionClient) {
    const db: Db = tx ?? this.prisma;
    return db.workItemTemplate.create({
      data: {
        workspaceId: data.workspaceId,
        name: data.name,
        scope: data.scope,
        departmentId: data.departmentId,
        processId: data.processId,
        payload: data.payload,
        subtaskCount: data.subtaskCount,
        checklistCount: data.checklistCount,
        createdBy: data.createdBy,
      },
      select: TEMPLATE_SELECT,
    });
  }

  async update(
    workspaceId: string,
    id: string,
    data: UpdateTemplateData,
    tx?: Prisma.TransactionClient,
  ) {
    const db: Db = tx ?? this.prisma;
    return db.workItemTemplate.update({
      where: { id, workspaceId },
      data,
      select: TEMPLATE_SELECT,
    });
  }

  async softDelete(workspaceId: string, id: string) {
    return this.prisma.workItemTemplate.update({
      where: { id, workspaceId },
      data: { deletedAt: new Date() },
      select: TEMPLATE_SELECT,
    });
  }

  /**
   * Assert-only: retorna `{ id }` se o process pertence ao workspace (via
   * `department.workspaceId`). Usado em `instantiate` para 404 cross-tenant
   * cedo, sem precisar carregar o grafo inteiro.
   */
  async findProcessInWorkspace(
    workspaceId: string,
    processId: string,
    tx?: Prisma.TransactionClient,
  ) {
    const db: Db = tx ?? this.prisma;
    return db.process.findFirst({
      where: {
        id: processId,
        deletedAt: null,
        department: { workspaceId },
      },
      select: { id: true, departmentId: true },
    });
  }

  /**
   * Primeiro `WorkflowStatus` NOT_STARTED do departamento do process. Usado
   * quando o caller de `instantiate` nao informa `statusId`.
   */
  async findDefaultStatusForProcess(
    processId: string,
    tx?: Prisma.TransactionClient,
  ) {
    const db: Db = tx ?? this.prisma;
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
   * Snapshot helper: carrega a task raiz com subtasks (depth 3), checklists
   * com items, e tags. Usado pelo service para montar o payload de snapshot.
   *
   * O Prisma nao suporta recursion infinita em include, entao replicamos
   * manualmente 3 niveis (que e o cap de profundidade do payload).
   */
  async findTaskForSnapshot(
    workspaceId: string,
    taskId: string,
    tx?: Prisma.TransactionClient,
  ) {
    const db: Db = tx ?? this.prisma;
    const include = {
      checklists: {
        where: { deletedAt: null },
        orderBy: { position: 'asc' as const },
        include: {
          items: {
            where: { deletedAt: null },
            orderBy: { position: 'asc' as const },
            select: {
              id: true,
              name: true,
              parentId: true,
              position: true,
            },
          },
        },
      },
      tags: { select: { tag: { select: { id: true, name: true } } } },
    } as const;

    return db.workItem.findFirst({
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
        priority: true,
        estimatedMinutes: true,
        checklists: include.checklists,
        tags: include.tags,
        children: {
          where: { deletedAt: null },
          orderBy: { sortOrder: 'asc' as const },
          select: {
            id: true,
            title: true,
            description: true,
            markdownContent: true,
            priority: true,
            estimatedMinutes: true,
            checklists: include.checklists,
            tags: include.tags,
            children: {
              where: { deletedAt: null },
              orderBy: { sortOrder: 'asc' as const },
              select: {
                id: true,
                title: true,
                description: true,
                markdownContent: true,
                priority: true,
                estimatedMinutes: true,
                checklists: include.checklists,
                tags: include.tags,
                children: {
                  where: { deletedAt: null },
                  orderBy: { sortOrder: 'asc' as const },
                  select: {
                    id: true,
                    title: true,
                    description: true,
                    markdownContent: true,
                    priority: true,
                    estimatedMinutes: true,
                    checklists: include.checklists,
                    tags: include.tags,
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  /**
   * Find-or-create de tag por `nameLower` dentro do workspace. O modulo
   * `task-tags` possui a semantica canonica; aqui replicamos o minimo
   * necessario para instantiate sem criar dependencia circular.
   */
  async upsertTagByName(
    workspaceId: string,
    rawName: string,
    tx: Prisma.TransactionClient,
  ): Promise<{ id: string; created: boolean }> {
    const name = rawName.trim();
    const nameLower = name.toLowerCase();

    const existing = await tx.workItemTag.findFirst({
      where: { workspaceId, nameLower, deletedAt: null },
      select: { id: true },
    });
    if (existing) {
      return { id: existing.id, created: false };
    }

    try {
      const created = await tx.workItemTag.create({
        data: { workspaceId, name, nameLower },
        select: { id: true },
      });
      return { id: created.id, created: true };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        // Race — busca de novo.
        const raced = await tx.workItemTag.findFirst({
          where: { workspaceId, nameLower, deletedAt: null },
          select: { id: true },
        });
        if (raced) return { id: raced.id, created: false };
      }
      throw error;
    }
  }
}
