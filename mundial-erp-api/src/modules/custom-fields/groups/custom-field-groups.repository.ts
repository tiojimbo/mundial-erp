import { Injectable } from '@nestjs/common';
import { CustomFieldGroup } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';

export interface CreateGroupData {
  workspaceId: string;
  name: string;
  color: string | null;
  position: number;
}

export interface UpdateGroupData {
  name?: string;
  color?: string | null;
  position?: number;
}

@Injectable()
export class CustomFieldGroupsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(workspaceId: string): Promise<CustomFieldGroup[]> {
    return this.prisma.customFieldGroup.findMany({
      where: { workspaceId },
      orderBy: [{ position: 'asc' }, { name: 'asc' }],
    });
  }

  async findOne(
    workspaceId: string,
    id: string,
  ): Promise<CustomFieldGroup | null> {
    return this.prisma.customFieldGroup.findFirst({
      where: { id, workspaceId },
    });
  }

  async create(data: CreateGroupData): Promise<CustomFieldGroup> {
    return this.prisma.customFieldGroup.create({
      data: {
        workspaceId: data.workspaceId,
        name: data.name,
        color: data.color,
        position: data.position,
      },
    });
  }

  async update(id: string, data: UpdateGroupData): Promise<CustomFieldGroup> {
    return this.prisma.customFieldGroup.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.color !== undefined ? { color: data.color } : {}),
        ...(data.position !== undefined ? { position: data.position } : {}),
      },
    });
  }

  async delete(id: string): Promise<CustomFieldGroup> {
    return this.prisma.customFieldGroup.delete({ where: { id } });
  }

  async findUsedByTaskType(
    workspaceId: string,
    taskTypeId: string,
  ): Promise<CustomFieldGroup[]> {
    const rows = await this.prisma.customFieldDefinition.findMany({
      where: {
        workspaceId,
        customTaskTypeId: taskTypeId,
        deletedAt: null,
        groupId: { not: null },
      },
      select: { group: true },
      distinct: ['groupId'],
    });
    return rows
      .map((row) => row.group)
      .filter((group): group is CustomFieldGroup => group !== null)
      .sort((a, b) => a.position - b.position || a.name.localeCompare(b.name));
  }

  async findUsedByList(
    workspaceId: string,
    listId: string,
  ): Promise<CustomFieldGroup[]> {
    const rows = await this.prisma.customFieldDefinition.findMany({
      where: {
        workspaceId,
        listId,
        deletedAt: null,
        groupId: { not: null },
      },
      select: { group: true },
      distinct: ['groupId'],
    });
    return rows
      .map((row) => row.group)
      .filter((group): group is CustomFieldGroup => group !== null)
      .sort((a, b) => a.position - b.position || a.name.localeCompare(b.name));
  }
}
