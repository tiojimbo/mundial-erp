import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class ListsRepository {
  constructor(private readonly prisma: PrismaService) {}

  private workspaceFilter(workspaceId: string): Prisma.ListWhereInput {
    return {
      OR: [
        { space: { workspaceId } },
        { folder: { space: { workspaceId } } },
      ],
    };
  }

  async create(_workspaceId: string, data: Prisma.ListCreateInput) {
    return this.prisma.list.create({ data });
  }

  async findById(workspaceId: string, id: string) {
    return this.prisma.list.findFirst({
      where: {
        id,
        deletedAt: null,
        ...this.workspaceFilter(workspaceId),
      },
      include: {
        sector: { select: { id: true, name: true, slug: true } },
        defaultTaskType: {
          select: {
            id: true,
            name: true,
            namePlural: true,
            description: true,
            icon: true,
            spaceId: true,
          },
        },
        statuses: {
          where: { deletedAt: null },
          orderBy: { position: 'asc' },
        },
        folder: {
          select: {
            id: true,
            statusInheritance: true,
            statuses: {
              where: { deletedAt: null },
              orderBy: { position: 'asc' },
            },
            space: {
              select: {
                statuses: {
                  where: { deletedAt: null, folderId: null, listId: null },
                  orderBy: { position: 'asc' },
                },
              },
            },
          },
        },
        space: {
          select: {
            statuses: {
              where: { deletedAt: null, folderId: null, listId: null },
              orderBy: { position: 'asc' },
            },
          },
        },
        _count: { select: { activities: { where: { deletedAt: null } } } },
      },
    });
  }

  async findBySlug(workspaceId: string, slug: string) {
    return this.prisma.list.findFirst({
      where: {
        slug,
        deletedAt: null,
        ...this.workspaceFilter(workspaceId),
      },
    });
  }

  async findMany(
    workspaceId: string,
    params: { skip?: number; take?: number },
  ) {
    const { skip = 0, take = 20 } = params;
    const where: Prisma.ListWhereInput = {
      deletedAt: null,
      ...this.workspaceFilter(workspaceId),
    };
    const [items, total] = await Promise.all([
      this.prisma.list.findMany({
        where,
        skip,
        take,
        orderBy: { position: 'asc' },
        include: {
          sector: { select: { id: true, name: true } },
        },
      }),
      this.prisma.list.count({ where }),
    ]);
    return { items, total };
  }

  async update(
    _workspaceId: string,
    id: string,
    data: Prisma.ListUpdateInput,
  ) {
    return this.prisma.list.update({ where: { id }, data });
  }

  async softDelete(_workspaceId: string, id: string) {
    return this.prisma.list.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async findFolderById(workspaceId: string, folderId: string) {
    return this.prisma.folder.findFirst({
      where: { id: folderId, deletedAt: null, space: { workspaceId } },
      select: { id: true, spaceId: true },
    });
  }

  async createWithDefaultView(
    _workspaceId: string,
    data: Prisma.ListCreateInput,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const list = await tx.list.create({ data });
      await tx.processView.create({
        data: {
          name: 'Lista',
          viewType: 'LIST',
          isPinned: true,
          list: { connect: { id: list.id } },
        },
      });
      return list;
    });
  }

  async findBySlugWithDetails(workspaceId: string, slug: string) {
    return this.prisma.list.findFirst({
      where: {
        slug,
        deletedAt: null,
        ...this.workspaceFilter(workspaceId),
      },
      include: {
        sector: { select: { id: true, name: true, slug: true } },
        folder: {
          select: {
            id: true,
            name: true,
            slug: true,
            spaceId: true,
            space: { select: { name: true, slug: true } },
          },
        },
        space: { select: { id: true, name: true, slug: true } },
        _count: { select: { activities: { where: { deletedAt: null } } } },
      },
    });
  }
}
