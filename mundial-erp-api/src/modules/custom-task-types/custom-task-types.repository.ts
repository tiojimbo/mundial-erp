import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

export interface CustomTaskTypeFindManyParams {
  skip?: number;
  take?: number;
  search?: string;
}

const BASE_SELECT = {
  id: true,
  workspaceId: true,
  spaceId: true,
  creatorId: true,
  name: true,
  namePlural: true,
  description: true,
  icon: true,
  color: true,
  avatarUrl: true,
  isBuiltin: true,
  sortOrder: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
  creator: {
    select: { id: true, name: true, email: true },
  },
} as const;

@Injectable()
export class CustomTaskTypesRepository {
  constructor(private readonly prisma: PrismaService) {}

  private buildVisibilityWhere(
    workspaceId: string,
  ): Prisma.CustomTaskTypeWhereInput {
    return {
      deletedAt: null,
      OR: [{ workspaceId: null }, { workspaceId }],
    };
  }

  async findMany(workspaceId: string, params: CustomTaskTypeFindManyParams) {
    const { skip = 0, take = 20, search } = params;

    const where: Prisma.CustomTaskTypeWhereInput =
      this.buildVisibilityWhere(workspaceId);

    if (search) {
      where.AND = [
        {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { namePlural: { contains: search, mode: 'insensitive' } },
          ],
        },
      ];
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.customTaskType.findMany({
        where,
        skip,
        take,
        orderBy: [{ isBuiltin: 'desc' }, { sortOrder: 'asc' }, { name: 'asc' }],
        select: BASE_SELECT,
      }),
      this.prisma.customTaskType.count({ where }),
    ]);

    return { items, total };
  }

  async findManyBySpace(workspaceId: string, spaceId: string) {
    return this.prisma.customTaskType.findMany({
      where: {
        workspaceId,
        spaceId,
        deletedAt: null,
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      select: BASE_SELECT,
    });
  }

  async findAllForWorkspaceFlat(workspaceId: string) {
    return this.prisma.customTaskType.findMany({
      where: this.buildVisibilityWhere(workspaceId),
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      select: BASE_SELECT,
    });
  }

  async create(
    workspaceId: string,
    data: {
      name: string;
      namePlural?: string | null;
      description?: string | null;
      icon?: string | null;
      color?: string | null;
      spaceId?: string | null;
      creatorId?: string | null;
    },
  ) {
    return this.prisma.customTaskType.create({
      data: {
        workspaceId,
        spaceId: data.spaceId ?? null,
        creatorId: data.creatorId ?? null,
        name: data.name,
        namePlural: data.namePlural ?? null,
        description: data.description ?? null,
        icon: data.icon ?? null,
        color: data.color ?? null,
        isBuiltin: false,
      },
      select: BASE_SELECT,
    });
  }

  async nameExists(workspaceId: string, name: string): Promise<boolean> {
    const found = await this.prisma.customTaskType.findFirst({
      where: {
        workspaceId,
        name: { equals: name, mode: 'insensitive' },
        deletedAt: null,
      },
      select: { id: true },
    });
    return found !== null;
  }

  async findById(id: string, workspaceId: string) {
    return this.prisma.customTaskType.findFirst({
      where: {
        id,
        ...this.buildVisibilityWhere(workspaceId),
      },
      select: BASE_SELECT,
    });
  }

  async update(
    id: string,
    data: {
      name?: string;
      namePlural?: string | null;
      description?: string | null;
      icon?: string | null;
      color?: string | null;
    },
  ) {
    return this.prisma.customTaskType.update({
      where: { id },
      data,
      select: BASE_SELECT,
    });
  }

  async softDeleteWithCascadeNull(id: string) {
    await this.prisma.$transaction([
      this.prisma.workItem.updateMany({
        where: { customTypeId: id, deletedAt: null },
        data: { customTypeId: null },
      }),
      this.prisma.space.updateMany({
        where: { defaultTaskTypeId: id, deletedAt: null },
        data: { defaultTaskTypeId: null },
      }),
      this.prisma.folder.updateMany({
        where: { defaultTaskTypeId: id, deletedAt: null },
        data: { defaultTaskTypeId: null },
      }),
      this.prisma.list.updateMany({
        where: { defaultTaskTypeId: id, deletedAt: null },
        data: { defaultTaskTypeId: null },
      }),
      this.prisma.customFieldDefinition.updateMany({
        where: { customTaskTypeId: id, deletedAt: null },
        data: { customTaskTypeId: null },
      }),
      this.prisma.customTaskType.update({
        where: { id },
        data: { deletedAt: new Date() },
        select: { id: true },
      }),
    ]);
  }

  async findByIdIncludingDeleted(id: string, workspaceId: string) {
    return this.prisma.customTaskType.findFirst({
      where: {
        id,
        OR: [{ workspaceId: null }, { workspaceId }],
      },
      select: {
        id: true,
        workspaceId: true,
        spaceId: true,
        isBuiltin: true,
        deletedAt: true,
      },
    });
  }

  async spaceBelongsToWorkspace(
    workspaceId: string,
    spaceId: string,
  ): Promise<boolean> {
    const space = await this.prisma.space.findFirst({
      where: { id: spaceId, workspaceId, deletedAt: null },
      select: { id: true },
    });
    return space !== null;
  }

}
