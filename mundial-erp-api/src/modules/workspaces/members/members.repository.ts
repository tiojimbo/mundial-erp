import { Injectable } from '@nestjs/common';
import { Prisma, WorkspaceMemberRole } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';

export type SidebarOrderJson = Prisma.JsonObject;

export interface FindMembersParams {
  workspaceId: string;
  skip?: number;
  take?: number;
  role?: WorkspaceMemberRole;
}

@Injectable()
export class MembersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findMany(params: FindMembersParams) {
    const { workspaceId, skip = 0, take = 20, role } = params;

    const where: Prisma.WorkspaceMemberWhereInput = {
      workspaceId,
      ...(role ? { role } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.workspaceMember.findMany({
        where,
        skip,
        take,
        orderBy: { joinedAt: 'asc' },
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      }),
      this.prisma.workspaceMember.count({ where }),
    ]);

    return { items, total };
  }

  async findById(workspaceId: string, userId: string) {
    return this.prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });
  }

  async create(data: {
    workspaceId: string;
    userId: string;
    role: WorkspaceMemberRole;
  }) {
    return this.prisma.workspaceMember.create({
      data,
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });
  }

  async updateRole(
    workspaceId: string,
    userId: string,
    role: WorkspaceMemberRole,
  ) {
    return this.prisma.workspaceMember.update({
      where: { workspaceId_userId: { workspaceId, userId } },
      data: { role },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });
  }

  async remove(workspaceId: string, userId: string) {
    return this.prisma.workspaceMember.delete({
      where: { workspaceId_userId: { workspaceId, userId } },
    });
  }

  async countByRole(workspaceId: string, role: WorkspaceMemberRole) {
    return this.prisma.workspaceMember.count({
      where: { workspaceId, role },
    });
  }

  async userExists(userId: string): Promise<boolean> {
    const count = await this.prisma.user.count({ where: { id: userId } });
    return count > 0;
  }

  async findSidebarOrder(workspaceId: string, userId: string) {
    return this.prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
      select: { sidebarOrder: true },
    });
  }

  // Merge atômico server-side: JSONB `||` evita race entre read-modify-write
  // concorrentes (dois PUTs simultâneos em buckets diferentes).
  async patchSidebarOrder(
    workspaceId: string,
    userId: string,
    patch: SidebarOrderJson,
  ): Promise<SidebarOrderJson | null> {
    const patchJson = JSON.stringify(patch);
    const rows = await this.prisma.$queryRaw<
      Array<{ sidebar_order: SidebarOrderJson }>
    >`
      UPDATE workspace_members
      SET sidebar_order = sidebar_order || ${patchJson}::jsonb,
          updated_at = NOW()
      WHERE workspace_id = ${workspaceId} AND user_id = ${userId}
      RETURNING sidebar_order
    `;
    return rows[0]?.sidebar_order ?? null;
  }
}
