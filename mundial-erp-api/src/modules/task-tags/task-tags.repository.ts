import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

/**
 * Repositorio de `WorkItemTag` e `WorkItemTagLink`.
 *
 * Nota: os models `workItemTag` e `workItemTagLink` sao adicionados pela
 * Migration 2 (`tasks_collaboration`). Ate a migration ser aplicada e
 * `prisma generate` rodar, o client Prisma nao expoe esses delegates e os
 * erros de compilacao deste arquivo sao esperados (ver PLANO-TASKS.md §5).
 */
export interface TaskTagFindManyParams {
  skip?: number;
  take?: number;
  search?: string;
}

export interface CreateTaskTagData {
  workspaceId: string;
  name: string;
  nameLower: string;
  color?: string | null;
  bgColor?: string | null;
}

export interface UpdateTaskTagData {
  name?: string;
  nameLower?: string;
  color?: string | null;
  bgColor?: string | null;
}

const TASK_TAG_SELECT = {
  id: true,
  workspaceId: true,
  name: true,
  nameLower: true,
  color: true,
  bgColor: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
} as const;

@Injectable()
export class TaskTagsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findMany(workspaceId: string, params: TaskTagFindManyParams) {
    const { skip = 0, take = 20, search } = params;

    const where: Prisma.WorkItemTagWhereInput = {
      workspaceId,
      deletedAt: null,
    };

    if (search) {
      where.nameLower = { contains: search.toLowerCase() };
    }

    const [items, total] = await Promise.all([
      this.prisma.workItemTag.findMany({
        where,
        skip,
        take,
        orderBy: { nameLower: 'asc' },
        select: TASK_TAG_SELECT,
      }),
      this.prisma.workItemTag.count({ where }),
    ]);

    return { items, total };
  }

  async findById(workspaceId: string, id: string) {
    return this.prisma.workItemTag.findFirst({
      where: { id, workspaceId, deletedAt: null },
      select: TASK_TAG_SELECT,
    });
  }

  async findByNameLower(workspaceId: string, nameLower: string) {
    return this.prisma.workItemTag.findFirst({
      where: { workspaceId, nameLower, deletedAt: null },
      select: TASK_TAG_SELECT,
    });
  }

  async create(data: CreateTaskTagData) {
    return this.prisma.workItemTag.create({
      data: {
        workspaceId: data.workspaceId,
        name: data.name,
        nameLower: data.nameLower,
        color: data.color ?? null,
        bgColor: data.bgColor ?? null,
      },
      select: TASK_TAG_SELECT,
    });
  }

  async update(workspaceId: string, id: string, data: UpdateTaskTagData) {
    return this.prisma.workItemTag.update({
      where: { id, workspaceId },
      data,
      select: TASK_TAG_SELECT,
    });
  }

  async softDelete(workspaceId: string, id: string) {
    return this.prisma.workItemTag.update({
      where: { id, workspaceId },
      data: { deletedAt: new Date() },
      select: TASK_TAG_SELECT,
    });
  }

  /**
   * Verifica se o `taskId` pertence ao workspace via
   * `process.department.workspaceId`. Retorna apenas o id para poder
   * responder com 404 sem vazar informacao.
   */
  async findTaskInWorkspace(workspaceId: string, taskId: string) {
    return this.prisma.workItem.findFirst({
      where: {
        id: taskId,
        deletedAt: null,
        process: { department: { workspaceId } },
      },
      select: { id: true },
    });
  }

  async findLink(workItemId: string, tagId: string) {
    return this.prisma.workItemTagLink.findUnique({
      where: { workItemId_tagId: { workItemId, tagId } },
      select: { workItemId: true, tagId: true },
    });
  }

  async attach(
    workItemId: string,
    tagId: string,
    tx?: Prisma.TransactionClient,
  ) {
    const db = tx ?? this.prisma;
    return db.workItemTagLink.create({
      data: { workItemId, tagId },
      select: { workItemId: true, tagId: true },
    });
  }

  async detach(
    workItemId: string,
    tagId: string,
    tx?: Prisma.TransactionClient,
  ) {
    const db = tx ?? this.prisma;
    return db.workItemTagLink.delete({
      where: { workItemId_tagId: { workItemId, tagId } },
      select: { workItemId: true, tagId: true },
    });
  }
}
