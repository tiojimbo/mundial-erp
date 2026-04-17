import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';

const MESSAGE_INCLUDE = {
  author: { select: { id: true, name: true, email: true } },
  assignee: { select: { id: true, name: true, email: true } },
  _count: { select: { replies: true } },
} satisfies Prisma.ChatMessageInclude;

export type ChatMessageWithRelations = Prisma.ChatMessageGetPayload<{
  include: typeof MESSAGE_INCLUDE;
}>;

@Injectable()
export class MessagesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.ChatMessageCreateInput) {
    return this.prisma.chatMessage.create({
      data,
      include: MESSAGE_INCLUDE,
    });
  }

  async findById(id: string) {
    return this.prisma.chatMessage.findFirst({
      where: { id, deletedAt: null },
      include: MESSAGE_INCLUDE,
    });
  }

  async findChannelId(messageId: string): Promise<string | null> {
    const result = await this.prisma.chatMessage.findFirst({
      where: { id: messageId, deletedAt: null },
      select: { channelId: true },
    });
    return result?.channelId ?? null;
  }

  async findByChannelId(
    channelId: string,
    params: { cursor?: string; limit: number },
  ) {
    const items = await this.prisma.chatMessage.findMany({
      where: { channelId, parentMessageId: null, deletedAt: null },
      take: params.limit + 1,
      ...(params.cursor && { cursor: { id: params.cursor }, skip: 1 }),
      orderBy: { createdAt: 'desc' },
      include: MESSAGE_INCLUDE,
    });

    const hasMore = items.length > params.limit;
    if (hasMore) items.pop();

    return {
      items,
      nextCursor: items.at(-1)?.id ?? null,
      hasMore,
    };
  }

  async findReplies(
    parentMessageId: string,
    params: { cursor?: string; limit: number },
  ) {
    const items = await this.prisma.chatMessage.findMany({
      where: { parentMessageId, deletedAt: null },
      take: params.limit + 1,
      ...(params.cursor && { cursor: { id: params.cursor }, skip: 1 }),
      orderBy: { createdAt: 'asc' },
      include: MESSAGE_INCLUDE,
    });

    const hasMore = items.length > params.limit;
    if (hasMore) items.pop();

    return {
      items,
      nextCursor: items.at(-1)?.id ?? null,
      hasMore,
    };
  }

  async update(id: string, data: Prisma.ChatMessageUpdateInput) {
    return this.prisma.chatMessage.update({
      where: { id },
      data,
      include: MESSAGE_INCLUDE,
    });
  }

  async softDelete(id: string) {
    return this.prisma.chatMessage.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async findTaggedUsers(
    messageId: string,
    params: { cursor?: string; limit: number },
  ) {
    const items = await this.prisma.chatMention.findMany({
      where: { messageId },
      take: params.limit + 1,
      ...(params.cursor && { cursor: { id: params.cursor }, skip: 1 }),
      orderBy: { createdAt: 'asc' },
      include: {
        mentionedUser: { select: { id: true, name: true, email: true } },
      },
    });

    const hasMore = items.length > params.limit;
    if (hasMore) items.pop();

    return {
      items,
      nextCursor: items.at(-1)?.id ?? null,
      hasMore,
    };
  }

  async createMentions(messageId: string, userIds: string[]) {
    if (!userIds.length) return;
    return this.prisma.chatMention.createMany({
      data: userIds.map((userId) => ({
        messageId,
        mentionedUserId: userId,
      })),
      skipDuplicates: true,
    });
  }

  async deleteMentions(messageId: string) {
    return this.prisma.chatMention.deleteMany({ where: { messageId } });
  }

  async createMessageFollowers(messageId: string, userIds: string[]) {
    if (!userIds.length) return;
    return this.prisma.chatMessageFollower.createMany({
      data: userIds.map((userId) => ({ messageId, userId })),
      skipDuplicates: true,
    });
  }
}
