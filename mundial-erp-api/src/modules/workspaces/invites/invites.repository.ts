import { Injectable } from '@nestjs/common';
import { InviteStatus, Prisma, WorkspaceMemberRole } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';

export interface FindInvitesParams {
  workspaceId: string;
  skip?: number;
  take?: number;
  status?: InviteStatus;
}

@Injectable()
export class InvitesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    workspaceId: string;
    email: string;
    role: WorkspaceMemberRole;
    token: string;
    expiresAt: Date;
    invitedById: string;
  }) {
    return this.prisma.workspaceInvite.create({ data });
  }

  async findMany(params: FindInvitesParams) {
    const { workspaceId, skip = 0, take = 20, status } = params;

    const where: Prisma.WorkspaceInviteWhereInput = {
      workspaceId,
      ...(status ? { status } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.workspaceInvite.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.workspaceInvite.count({ where }),
    ]);

    return { items, total };
  }

  async findById(id: string) {
    return this.prisma.workspaceInvite.findUnique({ where: { id } });
  }

  async findByToken(token: string) {
    return this.prisma.workspaceInvite.findUnique({ where: { token } });
  }

  async findPendingByEmail(workspaceId: string, email: string) {
    return this.prisma.workspaceInvite.findFirst({
      where: {
        workspaceId,
        email,
        status: InviteStatus.PENDING,
      },
    });
  }

  async revoke(id: string) {
    return this.prisma.workspaceInvite.update({
      where: { id },
      data: { status: InviteStatus.REVOKED },
    });
  }

  async acceptInTransaction(params: {
    inviteId: string;
    workspaceId: string;
    userId: string;
    role: WorkspaceMemberRole;
  }) {
    return this.prisma.$transaction(async (tx) => {
      await tx.workspaceInvite.update({
        where: { id: params.inviteId },
        data: { status: InviteStatus.ACCEPTED },
      });

      const member = await tx.workspaceMember.create({
        data: {
          workspaceId: params.workspaceId,
          userId: params.userId,
          role: params.role,
        },
      });

      return member;
    });
  }

  async memberExists(workspaceId: string, userId: string): Promise<boolean> {
    const count = await this.prisma.workspaceMember.count({
      where: { workspaceId, userId },
    });
    return count > 0;
  }

  async findMember(workspaceId: string, userId: string) {
    return this.prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
    });
  }

  // updateMany filtra por status — no-op se já não estiver PENDING.
  async markAcceptedIfPending(inviteId: string) {
    return this.prisma.workspaceInvite.updateMany({
      where: { id: inviteId, status: InviteStatus.PENDING },
      data: { status: InviteStatus.ACCEPTED },
    });
  }

  async findUserByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true },
    });
  }
}
