import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

const COMMENT_SELECT = {
  id: true,
  workItemId: true,
  authorId: true,
  body: true,
  bodyBlocks: true,
  editedAt: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
} as const;

export interface CommentCreateInput {
  workItemId: string;
  authorId: string;
  body: string;
  bodyBlocks?: Prisma.InputJsonValue | null;
}

export interface CommentUpdateInput {
  body?: string;
  bodyBlocks?: Prisma.InputJsonValue | null;
  editedAt?: Date;
}

export interface FindCommentsParams {
  skip?: number;
  take?: number;
}

@Injectable()
export class TaskCommentsRepository {
  constructor(private readonly prisma: PrismaService) {}

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

  async findByTask(
    workspaceId: string,
    taskId: string,
    params: FindCommentsParams,
  ) {
    const { skip = 0, take = 20 } = params;
    const where = {
      workItemId: taskId,
      deletedAt: null,
      workItem: { process: { department: { workspaceId } } },
    };

    const [items, total] = await Promise.all([
      this.prisma.workItemComment.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        select: COMMENT_SELECT,
      }),
      this.prisma.workItemComment.count({ where }),
    ]);

    return { items, total };
  }

  async findById(workspaceId: string, id: string) {
    return this.prisma.workItemComment.findFirst({
      where: {
        id,
        deletedAt: null,
        workItem: { process: { department: { workspaceId } } },
      },
      select: COMMENT_SELECT,
    });
  }

  async create(input: CommentCreateInput, tx?: Prisma.TransactionClient) {
    const db = tx ?? this.prisma;
    return db.workItemComment.create({
      data: {
        workItemId: input.workItemId,
        authorId: input.authorId,
        body: input.body,
        bodyBlocks:
          input.bodyBlocks === undefined || input.bodyBlocks === null
            ? Prisma.JsonNull
            : input.bodyBlocks,
      },
      select: COMMENT_SELECT,
    });
  }

  async update(
    id: string,
    input: CommentUpdateInput,
    tx?: Prisma.TransactionClient,
  ) {
    const db = tx ?? this.prisma;
    const data: Prisma.WorkItemCommentUncheckedUpdateInput = {};
    if (input.body !== undefined) data.body = input.body;
    if (input.bodyBlocks !== undefined) {
      data.bodyBlocks =
        input.bodyBlocks === null ? Prisma.JsonNull : input.bodyBlocks;
    }
    if (input.editedAt !== undefined) data.editedAt = input.editedAt;
    return db.workItemComment.update({
      where: { id },
      data,
      select: COMMENT_SELECT,
    });
  }

  async softDelete(id: string) {
    return this.prisma.workItemComment.update({
      where: { id },
      data: { deletedAt: new Date() },
      select: COMMENT_SELECT,
    });
  }

  /**
   * Resolve usernames -> userIds no workspace atual (via WorkspaceMember).
   * Usado pelo servico para expandir @menciones antes de enfileirar outbox.
   */
  async resolveUsernamesInWorkspace(
    workspaceId: string,
    usernames: string[],
  ): Promise<Array<{ id: string; username: string }>> {
    if (usernames.length === 0) return [];
    // Prisma: User tem campo `email`; usernames aqui correspondem a parte
    // antes do `@` do email OU ao `username` quando existir. Fazemos dois
    // lookups para ser tolerante com schemas distintos (User.username pode
    // nao existir em todos os tenants).
    const lowered = usernames.map((u) => u.toLowerCase());
    const users = await this.prisma.user.findMany({
      where: {
        workspaceMembers: { some: { workspaceId } },
        OR: [
          { email: { in: lowered } },
          ...lowered.map((u) => ({
            email: { startsWith: `${u}@` },
          })),
        ],
      },
      select: { id: true, email: true },
    });
    return users.map((u) => ({ id: u.id, username: u.email.split('@')[0] }));
  }
}
