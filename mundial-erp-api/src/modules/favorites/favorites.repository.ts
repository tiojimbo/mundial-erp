import { Injectable } from '@nestjs/common';
import { FavoriteEntity, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

const FAVORITE_SELECT = {
  id: true,
  userId: true,
  workspaceId: true,
  entityType: true,
  entityId: true,
  position: true,
  createdAt: true,
} as const;

@Injectable()
export class FavoritesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    userId: string,
    workspaceId: string,
    options: { entityType?: FavoriteEntity; skip?: number; take?: number } = {},
  ) {
    const { entityType, skip = 0, take = 100 } = options;
    const where: Prisma.FavoriteWhereInput = { userId, workspaceId };
    if (entityType) where.entityType = entityType;
    const [items, total] = await Promise.all([
      this.prisma.favorite.findMany({
        where,
        orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
        select: FAVORITE_SELECT,
        skip,
        take,
      }),
      this.prisma.favorite.count({ where }),
    ]);
    return { items, total };
  }

  findOne(userId: string, workspaceId: string, id: string) {
    return this.prisma.favorite.findFirst({
      where: { id, userId, workspaceId },
      select: FAVORITE_SELECT,
    });
  }

  findByEntity(
    userId: string,
    workspaceId: string,
    entityType: FavoriteEntity,
    entityId: string,
  ) {
    return this.prisma.favorite.findUnique({
      where: {
        uniq_user_workspace_entity: {
          userId,
          workspaceId,
          entityType,
          entityId,
        },
      },
      select: FAVORITE_SELECT,
    });
  }

  create(data: {
    userId: string;
    workspaceId: string;
    entityType: FavoriteEntity;
    entityId: string;
    position: number;
  }) {
    return this.prisma.favorite.create({ data, select: FAVORITE_SELECT });
  }

  delete(id: string) {
    return this.prisma.favorite.delete({
      where: { id },
      select: FAVORITE_SELECT,
    });
  }

  existsInWorkspace(
    workspaceId: string,
    entityType: FavoriteEntity,
    entityId: string,
  ): Promise<boolean> {
    switch (entityType) {
      case FavoriteEntity.SPACE:
        return this.prisma.space
          .findFirst({
            where: { id: entityId, workspaceId, deletedAt: null },
            select: { id: true },
          })
          .then(Boolean);
      case FavoriteEntity.FOLDER:
        return this.prisma.folder
          .findFirst({
            where: {
              id: entityId,
              deletedAt: null,
              space: { workspaceId },
            },
            select: { id: true },
          })
          .then(Boolean);
      case FavoriteEntity.LIST:
        return this.prisma.list
          .findFirst({
            where: {
              id: entityId,
              deletedAt: null,
              OR: [
                { space: { workspaceId } },
                { folder: { space: { workspaceId } } },
              ],
            },
            select: { id: true },
          })
          .then(Boolean);
      case FavoriteEntity.TASK:
        return this.prisma.workItem
          .findFirst({
            where: {
              id: entityId,
              deletedAt: null,
              list: { space: { workspaceId } },
            },
            select: { id: true },
          })
          .then(Boolean);
      case FavoriteEntity.CHAT_CHANNEL:
        return this.prisma.chatChannel
          .findFirst({
            where: { id: entityId, workspaceId, deletedAt: null },
            select: { id: true },
          })
          .then(Boolean);
    }
  }
}
