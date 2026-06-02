import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

const USER_PUBLIC_SELECT = {
  id: true,
  name: true,
  email: true,
  avatar: true,
} as const;

const COMMENT_SELECT = {
  id: true,
  workItemId: true,
  authorId: true,
  content: true,
  contentBlocks: true,
  parentId: true,
  mentions: true,
  assigneeId: true,
  assignedById: true,
  editedAt: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
  author: { select: USER_PUBLIC_SELECT },
  assignee: { select: USER_PUBLIC_SELECT },
  assignedBy: { select: USER_PUBLIC_SELECT },
  reactions: {
    select: { emoji: true, userId: true, createdAt: true },
    orderBy: { createdAt: 'asc' as const },
  },
} as const;

export interface CommentCreateInput {
  workItemId: string;
  authorId: string;
  content: string;
  contentBlocks?: Prisma.InputJsonValue | null;
  parentId?: string | null;
  mentions?: string[];
  assigneeId?: string | null;
  assignedById?: string | null;
}

export interface CommentUpdateInput {
  content?: string;
  contentBlocks?: Prisma.InputJsonValue | null;
  mentions?: string[];
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
        list: { space: { workspaceId } },
      },
      select: { id: true },
    });
  }

  async assertParentBelongsToTask(taskId: string, parentId: string) {
    return this.prisma.workItemComment.findFirst({
      where: { id: parentId, workItemId: taskId, deletedAt: null },
      select: { id: true },
    });
  }

  async assertUserInWorkspace(workspaceId: string, userId: string) {
    return this.prisma.user.findFirst({
      where: {
        id: userId,
        workspaceMembers: { some: { workspaceId } },
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
      workItem: { list: { space: { workspaceId } } },
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
        workItem: { list: { space: { workspaceId } } },
      },
      select: COMMENT_SELECT,
    });
  }

  async create(input: CommentCreateInput, tx?: Prisma.TransactionClient) {
    const db = tx ?? this.prisma;
    const data: Prisma.WorkItemCommentUncheckedCreateInput = {
      workItemId: input.workItemId,
      authorId: input.authorId,
      content: input.content,
      contentBlocks:
        input.contentBlocks === undefined || input.contentBlocks === null
          ? Prisma.JsonNull
          : input.contentBlocks,
      mentions:
        input.mentions === undefined || input.mentions.length === 0
          ? Prisma.JsonNull
          : (input.mentions as Prisma.InputJsonValue),
    };
    if (input.parentId) data.parentId = input.parentId;
    if (input.assigneeId) {
      data.assigneeId = input.assigneeId;
      if (input.assignedById) data.assignedById = input.assignedById;
    }
    return db.workItemComment.create({
      data,
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
    if (input.content !== undefined) data.content = input.content;
    if (input.contentBlocks !== undefined) {
      data.contentBlocks =
        input.contentBlocks === null ? Prisma.JsonNull : input.contentBlocks;
    }
    if (input.mentions !== undefined) {
      data.mentions =
        input.mentions.length === 0
          ? Prisma.JsonNull
          : (input.mentions as Prisma.InputJsonValue);
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

  async findReaction(commentId: string, userId: string, emoji: string) {
    return this.prisma.commentReaction.findUnique({
      where: { commentId_userId_emoji: { commentId, userId, emoji } },
      select: { commentId: true, userId: true, emoji: true },
    });
  }

  async createReaction(commentId: string, userId: string, emoji: string) {
    return this.prisma.commentReaction.create({
      data: { commentId, userId, emoji },
      select: { commentId: true, userId: true, emoji: true },
    });
  }

  async deleteReaction(commentId: string, userId: string, emoji: string) {
    return this.prisma.commentReaction.delete({
      where: { commentId_userId_emoji: { commentId, userId, emoji } },
      select: { commentId: true, userId: true, emoji: true },
    });
  }

  async resolveUsernamesInWorkspace(
    workspaceId: string,
    usernames: string[],
  ): Promise<Array<{ id: string; username: string }>> {
    if (usernames.length === 0) return [];
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
