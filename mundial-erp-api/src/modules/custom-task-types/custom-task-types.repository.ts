import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

export interface CustomTaskTypeFindManyParams {
  skip?: number;
  take?: number;
  search?: string;
}

/**
 * Repositorio de CustomTaskType — queries com `select` explicito (CTO note #4)
 * e filtro multi-tenant `workspaceId IS NULL OR workspaceId = :ws` (§8.1).
 */
@Injectable()
export class CustomTaskTypesRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Builder de where multi-tenant: aceita builtins globais (workspaceId NULL)
   * e privados do workspace atual.
   */
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
        orderBy: [
          { isBuiltin: 'desc' },
          { sortOrder: 'asc' },
          { name: 'asc' },
        ],
        select: {
          id: true,
          workspaceId: true,
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
        },
      }),
      this.prisma.customTaskType.count({ where }),
    ]);

    return { items, total };
  }

  async create(
    workspaceId: string,
    data: {
      name: string;
      namePlural?: string | null;
      description?: string | null;
      icon?: string | null;
      color?: string | null;
    },
  ) {
    return this.prisma.customTaskType.create({
      data: {
        workspaceId,
        name: data.name,
        namePlural: data.namePlural ?? null,
        description: data.description ?? null,
        icon: data.icon ?? null,
        color: data.color ?? null,
        isBuiltin: false,
      },
      select: {
        id: true,
        workspaceId: true,
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
      },
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
      select: {
        id: true,
        workspaceId: true,
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
      },
    });
  }
}
