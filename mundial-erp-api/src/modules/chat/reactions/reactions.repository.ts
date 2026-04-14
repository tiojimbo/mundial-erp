import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';

@Injectable()
export class ReactionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(messageId: string, userId: string, emojiName: string) {
    return this.prisma.chatReaction.create({
      data: { messageId, userId, emojiName },
    });
  }

  async delete(messageId: string, userId: string, emojiName: string) {
    return this.prisma.chatReaction.delete({
      where: {
        uq_reaction: { messageId, userId, emojiName },
      },
    });
  }

  async exists(
    messageId: string,
    userId: string,
    emojiName: string,
  ): Promise<boolean> {
    const count = await this.prisma.chatReaction.count({
      where: { messageId, userId, emojiName },
    });
    return count > 0;
  }

  async findByMessage(
    messageId: string,
    params: { cursor?: string; limit: number },
  ) {
    const items = await this.prisma.chatReaction.findMany({
      where: { messageId },
      take: params.limit + 1,
      ...(params.cursor && { cursor: { id: params.cursor }, skip: 1 }),
      orderBy: { createdAt: 'asc' },
      include: { user: { select: { id: true, name: true } } },
    });

    const hasMore = items.length > params.limit;
    if (hasMore) items.pop();

    return {
      items,
      nextCursor: items.at(-1)?.id ?? null,
      hasMore,
    };
  }

  async findGroupedByMessage(messageId: string) {
    const reactions = await this.prisma.chatReaction.groupBy({
      by: ['emojiName'],
      where: { messageId },
      _count: { emojiName: true },
    });

    const result: Array<{
      emojiName: string;
      count: number;
      userIds: string[];
      userNames: string[];
    }> = [];

    for (const group of reactions) {
      const users = await this.prisma.chatReaction.findMany({
        where: { messageId, emojiName: group.emojiName },
        select: { user: { select: { id: true, name: true } } },
        take: 10,
      });

      result.push({
        emojiName: group.emojiName,
        count: group._count.emojiName,
        userIds: users.map((u) => u.user.id),
        userNames: users.map((u) => u.user.name),
      });
    }

    return result;
  }
}
