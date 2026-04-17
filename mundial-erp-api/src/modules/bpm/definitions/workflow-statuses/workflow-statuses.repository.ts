import { Injectable } from '@nestjs/common';
import { Prisma, StatusCategory } from '@prisma/client';
import { PrismaService } from '../../../../database/prisma.service';

@Injectable()
export class WorkflowStatusesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.WorkflowStatusCreateInput) {
    return this.prisma.workflowStatus.create({ data });
  }

  async findById(id: string) {
    return this.prisma.workflowStatus.findFirst({
      where: { id, deletedAt: null },
      include: {
        department: { select: { id: true, name: true } },
      },
    });
  }

  async findByDepartment(departmentId: string) {
    return this.prisma.workflowStatus.findMany({
      where: { departmentId, areaId: null, deletedAt: null },
      orderBy: { sortOrder: 'asc' },
      include: {
        department: { select: { id: true, name: true } },
      },
    });
  }

  async findByArea(areaId: string) {
    return this.prisma.workflowStatus.findMany({
      where: { areaId, deletedAt: null },
      orderBy: { sortOrder: 'asc' },
      include: {
        department: { select: { id: true, name: true } },
      },
    });
  }

  async copyDepartmentStatusesToArea(
    departmentId: string,
    areaId: string,
  ) {
    const deptStatuses = await this.prisma.workflowStatus.findMany({
      where: { departmentId, areaId: null, deletedAt: null },
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
    category: StatusCategory,
    departmentId: string,
  ): Promise<number> {
    return this.prisma.workflowStatus.count({
      where: { category, departmentId, deletedAt: null },
    });
  }

  async countWorkItemsByStatusId(statusId: string): Promise<number> {
    return this.prisma.workItem.count({
      where: { statusId, deletedAt: null },
    });
  }

  async migrateWorkItems(fromStatusId: string, toStatusId: string) {
    return this.prisma.workItem.updateMany({
      where: { statusId: fromStatusId, deletedAt: null },
      data: { statusId: toStatusId },
    });
  }

  async getMaxSortOrder(departmentId: string): Promise<number> {
    const result = await this.prisma.workflowStatus.findFirst({
      where: { departmentId, deletedAt: null },
      orderBy: { sortOrder: 'desc' },
      select: { sortOrder: true },
    });
    return result?.sortOrder ?? -1;
  }

  async update(id: string, data: Prisma.WorkflowStatusUpdateInput) {
    return this.prisma.workflowStatus.update({
      where: { id },
      data,
      include: {
        department: { select: { id: true, name: true } },
      },
    });
  }

  async softDelete(id: string) {
    return this.prisma.workflowStatus.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async findAreaById(areaId: string) {
    return this.prisma.area.findFirst({
      where: { id: areaId, deletedAt: null },
      select: { id: true, departmentId: true, useSpaceStatuses: true },
    });
  }

  async updateManySortOrder(items: Array<{ id: string; sortOrder: number }>) {
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
