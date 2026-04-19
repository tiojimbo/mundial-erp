import { Injectable } from '@nestjs/common';
import { Prisma, WorkspaceMemberRole } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

export interface FindWorkspacesByMemberParams {
  userId: string;
  skip?: number;
  take?: number;
  search?: string;
}

@Injectable()
export class WorkspacesRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Cria workspace e ja insere o creator como OWNER em uma unica transacao.
   * Garante invariante: nenhum workspace existe sem WorkspaceMember OWNER.
   */
  async createWithOwner(params: {
    name: string;
    slug: string;
    logoUrl?: string;
    color?: string;
    ownerId: string;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const workspace = await tx.workspace.create({
        data: {
          name: params.name,
          slug: params.slug,
          logoUrl: params.logoUrl,
          color: params.color,
          ownerId: params.ownerId,
        },
      });

      await tx.workspaceMember.create({
        data: {
          workspaceId: workspace.id,
          userId: params.ownerId,
          role: WorkspaceMemberRole.OWNER,
        },
      });

      return workspace;
    });
  }

  async findById(id: string) {
    return this.prisma.workspace.findFirst({
      where: { id, deletedAt: null },
    });
  }

  async findBySlug(slug: string) {
    return this.prisma.workspace.findFirst({
      where: { slug, deletedAt: null },
    });
  }

  async slugExists(slug: string): Promise<boolean> {
    const count = await this.prisma.workspace.count({
      where: { slug, deletedAt: null },
    });
    return count > 0;
  }

  async findManyByMember(params: FindWorkspacesByMemberParams) {
    const { userId, skip = 0, take = 20, search } = params;

    const where: Prisma.WorkspaceWhereInput = {
      deletedAt: null,
      members: { some: { userId } },
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { slug: { contains: search, mode: 'insensitive' as const } },
        ],
      }),
    };

    const [items, total] = await Promise.all([
      this.prisma.workspace.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.workspace.count({ where }),
    ]);

    return { items, total };
  }

  async update(id: string, data: Prisma.WorkspaceUpdateInput) {
    return this.prisma.workspace.update({ where: { id }, data });
  }

  async softDelete(id: string) {
    return this.prisma.workspace.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  /**
   * Conta seats em uso por workspace, segregando OWNER+ADMIN+MEMBER (membros)
   * de GUEST (convidados). Usado pelo endpoint de billing/seats.
   */
  async countSeats(workspaceId: string) {
    const grouped = await this.prisma.workspaceMember.groupBy({
      by: ['role'],
      where: { workspaceId },
      _count: { _all: true },
    });

    let membersUsed = 0;
    let guestsUsed = 0;
    for (const row of grouped) {
      if (row.role === WorkspaceMemberRole.GUEST) {
        guestsUsed += row._count._all;
      } else {
        membersUsed += row._count._all;
      }
    }

    return { membersUsed, guestsUsed };
  }
}
