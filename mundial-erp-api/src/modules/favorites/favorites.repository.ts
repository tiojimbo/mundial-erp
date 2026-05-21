import { Injectable } from '@nestjs/common';
import { FavoriteEntity, FavoritePosition, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { FavoriteEntitySummary } from './dtos/favorite-response.dto';

const FAVORITE_SELECT = {
  id: true,
  userId: true,
  workspaceId: true,
  entityType: true,
  entityId: true,
  position: true,
  order: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class FavoritesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    userId: string,
    workspaceId: string,
    options: { entityType?: FavoriteEntity; skip?: number; take?: number } = {},
  ) {
    const { entityType, skip = 0, take = 200 } = options;
    const where: Prisma.FavoriteWhereInput = { userId, workspaceId };
    if (entityType) where.entityType = entityType;
    const [items, total] = await Promise.all([
      this.prisma.favorite.findMany({
        where,
        orderBy: [{ position: 'asc' }, { order: 'asc' }, { createdAt: 'asc' }],
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
    position: FavoritePosition;
    order: number;
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

  async hydrateEntities(
    workspaceId: string,
    items: ReadonlyArray<{ entityType: FavoriteEntity; entityId: string }>,
  ): Promise<Map<string, FavoriteEntitySummary>> {
    const result = new Map<string, FavoriteEntitySummary>();
    if (items.length === 0) return result;

    const idsByType: Record<FavoriteEntity, string[]> = {
      SPACE: [],
      FOLDER: [],
      LIST: [],
      TASK: [],
      CHAT_CHANNEL: [],
    };
    for (const item of items) idsByType[item.entityType].push(item.entityId);

    const key = (type: FavoriteEntity, id: string) => `${type}:${id}`;

    if (idsByType.SPACE.length) {
      const spaces = await this.prisma.space.findMany({
        where: { id: { in: idsByType.SPACE }, workspaceId, deletedAt: null },
        select: { id: true, name: true, icon: true },
      });
      for (const s of spaces) {
        result.set(key(FavoriteEntity.SPACE, s.id), {
          id: s.id,
          name: s.name,
          icon: s.icon ?? null,
        });
      }
    }
    if (idsByType.FOLDER.length) {
      const folders = await this.prisma.folder.findMany({
        where: {
          id: { in: idsByType.FOLDER },
          deletedAt: null,
          space: { workspaceId },
        },
        select: { id: true, name: true, icon: true, spaceId: true },
      });
      for (const f of folders) {
        result.set(key(FavoriteEntity.FOLDER, f.id), {
          id: f.id,
          name: f.name,
          icon: f.icon ?? null,
          spaceId: f.spaceId,
        });
      }
    }
    if (idsByType.LIST.length) {
      const lists = await this.prisma.list.findMany({
        where: {
          id: { in: idsByType.LIST },
          deletedAt: null,
          OR: [
            { space: { workspaceId } },
            { folder: { space: { workspaceId } } },
          ],
        },
        select: {
          id: true,
          name: true,
          icon: true,
          folderId: true,
          spaceId: true,
        },
      });
      for (const l of lists) {
        result.set(key(FavoriteEntity.LIST, l.id), {
          id: l.id,
          name: l.name,
          icon: l.icon ?? null,
          folderId: l.folderId,
          spaceId: l.spaceId,
        });
      }
    }
    if (idsByType.TASK.length) {
      const tasks = await this.prisma.workItem.findMany({
        where: {
          id: { in: idsByType.TASK },
          deletedAt: null,
          list: { space: { workspaceId } },
        },
        select: { id: true, title: true, listId: true },
      });
      for (const t of tasks) {
        result.set(key(FavoriteEntity.TASK, t.id), {
          id: t.id,
          name: t.title,
          listId: t.listId,
        });
      }
    }
    if (idsByType.CHAT_CHANNEL.length) {
      const channels = await this.prisma.chatChannel.findMany({
        where: {
          id: { in: idsByType.CHAT_CHANNEL },
          workspaceId,
          deletedAt: null,
        },
        select: { id: true, name: true },
      });
      for (const c of channels) {
        result.set(key(FavoriteEntity.CHAT_CHANNEL, c.id), {
          id: c.id,
          name: c.name ?? '',
        });
      }
    }
    return result;
  }
}
