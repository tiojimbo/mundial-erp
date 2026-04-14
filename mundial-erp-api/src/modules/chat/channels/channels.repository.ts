import { Injectable } from '@nestjs/common';
import { ChannelMemberRole, ChannelType, Prisma } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';

@Injectable()
export class ChannelsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.ChatChannelCreateInput) {
    return this.prisma.chatChannel.create({
      data,
      include: { _count: { select: { members: true } } },
    });
  }

  async findById(id: string) {
    return this.prisma.chatChannel.findFirst({
      where: { id, deletedAt: null },
      include: { _count: { select: { members: true } } },
    });
  }

  async findByName(name: string) {
    return this.prisma.chatChannel.findFirst({
      where: { name, type: 'CHANNEL', deletedAt: null },
    });
  }

  async findByLocation(locationEntity: string, locationId: string) {
    return this.prisma.chatChannel.findFirst({
      where: { locationEntity, locationId, deletedAt: null },
    });
  }

  async findDmByParticipantHash(hash: string) {
    return this.prisma.chatChannel.findFirst({
      where: {
        participantHash: hash,
        type: 'DIRECT_MESSAGE',
        deletedAt: null,
      },
      include: { _count: { select: { members: true } } },
    });
  }

  async findManyForUser(
    userId: string,
    params: {
      cursor?: string;
      limit: number;
      search?: string;
      type?: ChannelType;
      isFollower?: boolean;
      includeClosed?: boolean;
    },
  ) {
    const { cursor, limit, search, type, isFollower, includeClosed } = params;

    const where: Prisma.ChatChannelWhereInput = {
      deletedAt: null,
      members: {
        some: {
          userId,
          leftAt: null,
          ...(isFollower && { isFollower: true }),
          ...(!includeClosed && { closedAt: null }),
        },
      },
      ...(type && { type }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          {
            description: { contains: search, mode: 'insensitive' as const },
          },
        ],
      }),
    };

    const items = await this.prisma.chatChannel.findMany({
      where,
      take: limit + 1,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
      orderBy: { updatedAt: 'desc' },
      include: { _count: { select: { members: true } } },
    });

    const hasMore = items.length > limit;
    if (hasMore) items.pop();

    return {
      items,
      nextCursor: items.at(-1)?.id ?? null,
      hasMore,
    };
  }

  async findMembers(
    channelId: string,
    params: { cursor?: string; limit: number },
  ) {
    const items = await this.prisma.chatChannelMember.findMany({
      where: { channelId, leftAt: null },
      take: params.limit + 1,
      ...(params.cursor && { cursor: { id: params.cursor }, skip: 1 }),
      orderBy: { createdAt: 'asc' },
      include: { user: { select: { id: true, name: true, email: true } } },
    });
    const hasMore = items.length > params.limit;
    if (hasMore) items.pop();
    return { items, nextCursor: items.at(-1)?.id ?? null, hasMore };
  }

  async findFollowers(
    channelId: string,
    params: { cursor?: string; limit: number },
  ) {
    const items = await this.prisma.chatChannelMember.findMany({
      where: { channelId, leftAt: null, isFollower: true },
      take: params.limit + 1,
      ...(params.cursor && { cursor: { id: params.cursor }, skip: 1 }),
      orderBy: { createdAt: 'asc' },
      include: { user: { select: { id: true, name: true, email: true } } },
    });
    const hasMore = items.length > params.limit;
    if (hasMore) items.pop();
    return { items, nextCursor: items.at(-1)?.id ?? null, hasMore };
  }

  async countActiveMembers(channelId: string): Promise<number> {
    return this.prisma.chatChannelMember.count({
      where: { channelId, leftAt: null },
    });
  }

  async addMember(
    channelId: string,
    userId: string,
    role: ChannelMemberRole,
  ) {
    return this.prisma.chatChannelMember.upsert({
      where: { uq_channel_member: { channelId, userId } },
      create: { channelId, userId, role },
      update: { role, leftAt: null, isFollower: true },
    });
  }

  async addMembersMany(
    channelId: string,
    userIds: string[],
    role: ChannelMemberRole,
  ) {
    return this.prisma.chatChannelMember.createMany({
      data: userIds.map((userId) => ({ channelId, userId, role })),
      skipDuplicates: true,
    });
  }

  async removeMember(channelId: string, userId: string) {
    return this.prisma.chatChannelMember.update({
      where: { uq_channel_member: { channelId, userId } },
      data: { leftAt: new Date() },
    });
  }

  async getMemberRole(
    channelId: string,
    userId: string,
  ): Promise<ChannelMemberRole | null> {
    const member = await this.prisma.chatChannelMember.findUnique({
      where: { uq_channel_member: { channelId, userId } },
      select: { role: true, leftAt: true },
    });
    if (!member || member.leftAt) return null;
    return member.role;
  }

  async isMember(channelId: string, userId: string): Promise<boolean> {
    const count = await this.prisma.chatChannelMember.count({
      where: { channelId, userId, leftAt: null },
    });
    return count > 0;
  }

  async updateLastRead(channelId: string, userId: string) {
    return this.prisma.chatChannelMember.update({
      where: { uq_channel_member: { channelId, userId } },
      data: { lastReadAt: new Date() },
    });
  }

  async setFollower(
    channelId: string,
    userId: string,
    isFollower: boolean,
  ) {
    return this.prisma.chatChannelMember.update({
      where: { uq_channel_member: { channelId, userId } },
      data: { isFollower },
    });
  }

  async closeDm(channelId: string, userId: string) {
    return this.prisma.chatChannelMember.update({
      where: { uq_channel_member: { channelId, userId } },
      data: { closedAt: new Date() },
    });
  }

  async openDm(channelId: string, userId: string) {
    return this.prisma.chatChannelMember.update({
      where: { uq_channel_member: { channelId, userId } },
      data: { closedAt: null },
    });
  }

  async updateMemberRole(
    channelId: string,
    userId: string,
    role: ChannelMemberRole,
  ) {
    return this.prisma.chatChannelMember.update({
      where: { uq_channel_member: { channelId, userId } },
      data: { role },
    });
  }

  async findChannelIdsForUser(userId: string): Promise<string[]> {
    const members = await this.prisma.chatChannelMember.findMany({
      where: { userId, leftAt: null },
      select: { channelId: true },
    });
    return members.map((m) => m.channelId);
  }

  async update(id: string, data: Prisma.ChatChannelUpdateInput) {
    return this.prisma.chatChannel.update({
      where: { id },
      data,
      include: { _count: { select: { members: true } } },
    });
  }

  async softDelete(id: string) {
    return this.prisma.chatChannel.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
