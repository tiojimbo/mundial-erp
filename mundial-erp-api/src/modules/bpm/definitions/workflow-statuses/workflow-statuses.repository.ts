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
      where: { id, deletedAt: null, department: { workspaceId } },
      include: {
        department: { select: { id: true, name: true } },
      },
    });
  }

  async findByDepartment(workspaceId: string, departmentId: string) {
    return this.prisma.workflowStatus.findMany({
      where: {
        departmentId,
        areaId: null,
        deletedAt: null,
        department: { workspaceId },
      },
      orderBy: { sortOrder: 'asc' },
      include: {
        department: { select: { id: true, name: true } },
      },
    });
  }

  async findByArea(workspaceId: string, areaId: string) {
    return this.prisma.workflowStatus.findMany({
      where: {
        areaId,
        deletedAt: null,
        area: { department: { workspaceId } },
      },
      orderBy: { sortOrder: 'asc' },
      include: {
        department: { select: { id: true, name: true } },
      },
    });
  }

  async copyDepartmentStatusesToArea(
    workspaceId: string,
    departmentId: string,
    areaId: string,
  ) {
    const deptStatuses = await this.prisma.workflowStatus.findMany({
      where: {
        departmentId,
        areaId: null,
        deletedAt: null,
        department: { workspaceId },
      },
      orderBy: { sortOrder: 'asc' },
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
          department: { connect: { id: departmentId } },
          area: { connect: { id: areaId } },
        },
      }),
    );

    return this.prisma.$transaction(creates);
  }

  async countByCategoryAndDepartment(
    workspaceId: string,
    category: StatusCategory,
    departmentId: string,
  ): Promise<number> {
    return this.prisma.workflowStatus.count({
      where: {
        category,
        departmentId,
        deletedAt: null,
        department: { workspaceId },
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
        process: { department: { workspaceId } },
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
        process: { department: { workspaceId } },
      },
      data: { statusId: toStatusId },
    });
  }

  async getMaxSortOrder(
    workspaceId: string,
    departmentId: string,
  ): Promise<number> {
    const result = await this.prisma.workflowStatus.findFirst({
      where: { departmentId, deletedAt: null, department: { workspaceId } },
      orderBy: { sortOrder: 'desc' },
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
        department: { select: { id: true, name: true } },
      },
    });
  }

  async softDelete(_workspaceId: string, id: string) {
    return this.prisma.workflowStatus.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async findAreaById(workspaceId: string, areaId: string) {
    return this.prisma.area.findFirst({
      where: { id: areaId, deletedAt: null, department: { workspaceId } },
      select: { id: true, departmentId: true, useSpaceStatuses: true },
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
