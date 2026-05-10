import { Injectable } from '@nestjs/common';
import { Prisma, StatusCategory } from '@prisma/client';
import { PrismaService } from '../../../../database/prisma.service';

@Injectable()
export class WorkflowStatusesRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * WorkflowStatus NÃO possui workspaceId direto. Escopo via department.
   */
  async create(_workspaceId: string, data: Prisma.WorkflowStatusCreateInput) {
    return this.prisma.workflowStatus.create({ data });
  }

  async findById(workspaceId: string, id: string) {
    return this.prisma.workflowStatus.findFirst({
      where: { id, deletedAt: null, space: { workspaceId } },
      include: {
        space: { select: { id: true, name: true } },
      },
    });
  }

  async findByDepartment(workspaceId: string, spaceId: string) {
    return this.prisma.workflowStatus.findMany({
      where: {
        spaceId,
        folderId: null,
        deletedAt: null,
        space: { workspaceId },
      },
      orderBy: { position: 'asc' },
      include: {
        space: { select: { id: true, name: true } },
      },
    });
  }

  async findByArea(workspaceId: string, folderId: string) {
    return this.prisma.workflowStatus.findMany({
      where: {
        folderId,
        deletedAt: null,
        folder: { space: { workspaceId } },
      },
      orderBy: { position: 'asc' },
      include: {
        space: { select: { id: true, name: true } },
      },
    });
  }

  async copyDepartmentStatusesToArea(
    workspaceId: string,
    spaceId: string,
    folderId: string,
  ) {
    const deptStatuses = await this.prisma.workflowStatus.findMany({
      where: {
        spaceId,
        folderId: null,
        deletedAt: null,
        space: { workspaceId },
      },
      orderBy: { position: 'asc' },
    });

    const creates = deptStatuses.map((s) =>
      this.prisma.workflowStatus.create({
        data: {
          name: s.name,
          category: s.category,
          color: s.color,
          icon: s.icon,
          sortOrder: s.sortOrder,
          isDefault: s.isDefault,
          space: { connect: { id: spaceId } },
          area: { connect: { id: folderId } },
        },
      }),
    );

    return this.prisma.$transaction(creates);
  }

  async countByCategoryAndDepartment(
    workspaceId: string,
    category: StatusCategory,
    spaceId: string,
  ): Promise<number> {
    return this.prisma.workflowStatus.count({
      where: {
        category,
        spaceId,
        deletedAt: null,
        space: { workspaceId },
      },
    });
  }

  async countWorkItemsByStatusId(
    workspaceId: string,
    statusId: string,
  ): Promise<number> {
    return this.prisma.workItem.count({
      where: {
        statusId,
        deletedAt: null,
        list: { space: { workspaceId } },
      },
    });
  }

  async migrateWorkItems(
    workspaceId: string,
    fromStatusId: string,
    toStatusId: string,
  ) {
    return this.prisma.workItem.updateMany({
      where: {
        statusId: fromStatusId,
        deletedAt: null,
        list: { space: { workspaceId } },
      },
      data: { statusId: toStatusId },
    });
  }

  async getMaxSortOrder(
    workspaceId: string,
    spaceId: string,
  ): Promise<number> {
    const result = await this.prisma.workflowStatus.findFirst({
      where: { spaceId, deletedAt: null, space: { workspaceId } },
      orderBy: { position: 'desc' },
      select: { sortOrder: true },
    });
    return result?.sortOrder ?? -1;
  }

  async update(
    _workspaceId: string,
    id: string,
    data: Prisma.WorkflowStatusUpdateInput,
  ) {
    return this.prisma.workflowStatus.update({
      where: { id },
      data,
      include: {
        space: { select: { id: true, name: true } },
      },
    });
  }

  async softDelete(_workspaceId: string, id: string) {
    return this.prisma.workflowStatus.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async findAreaById(workspaceId: string, folderId: string) {
    return this.prisma.folder.findFirst({
      where: { id: folderId, deletedAt: null, space: { workspaceId } },
      select: { id: true, spaceId: true, useSpaceStatuses: true },
    });
  }

  async updateManySortOrder(
    _workspaceId: string,
    items: Array<{ id: string; sortOrder: number }>,
  ) {
    return this.prisma.$transaction(
      items.map((item) =>
        this.prisma.workflowStatus.update({
          where: { id: item.id },
          data: { sortOrder: item.sortOrder },
        }),
      ),
    );
  }
}
