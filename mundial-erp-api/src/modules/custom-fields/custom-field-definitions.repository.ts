import { Injectable } from '@nestjs/common';
import { CustomFieldDefinition, CustomFieldType, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

export interface CreateData {
  workspaceId: string;
  key: string;
  name: string;
  label: string;
  description?: string | null;
  type: CustomFieldType;
  required: boolean;
  options: Prisma.InputJsonValue;
  config: Prisma.InputJsonValue | null;
  defaultValue?: Prisma.InputJsonValue | null;
  validation?: Prisma.InputJsonValue | null;
  pinned?: boolean;
  visibleToGuests?: boolean;
  fillMethod?: string;
  sortOrder: number;
  createdById?: string | null;
  spaceId?: string | null;
  folderId?: string | null;
  listId?: string | null;
  customTaskTypeId?: string | null;
  groupId?: string | null;
  groupName?: string | null;
  groupPosition?: number | null;
  groupColor?: string | null;
}

export interface UpdateData {
  name?: string;
  label?: string;
  description?: string | null;
  required?: boolean;
  options?: Prisma.InputJsonValue;
  config?: Prisma.InputJsonValue | null;
  defaultValue?: Prisma.InputJsonValue | null;
  validation?: Prisma.InputJsonValue | null;
  pinned?: boolean;
  visibleToGuests?: boolean;
  fillMethod?: string;
  sortOrder?: number;
  groupId?: string | null;
  groupName?: string | null;
  groupPosition?: number | null;
  groupColor?: string | null;
}

const DEFINITION_INCLUDE = {
  createdBy: { select: { id: true, name: true, email: true } },
  group: true,
} as const;

@Injectable()
export class CustomFieldDefinitionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findVisibleById(workspaceId: string, id: string) {
    return this.prisma.customFieldDefinition.findFirst({
      where: {
        id,
        deletedAt: null,
        OR: [{ workspaceId }, { workspaceId: null }],
      },
      include: DEFINITION_INCLUDE,
    });
  }

  async findOwnedById(workspaceId: string, id: string) {
    return this.prisma.customFieldDefinition.findFirst({
      where: {
        id,
        workspaceId,
        deletedAt: null,
      },
      include: DEFINITION_INCLUDE,
    });
  }

  async findByKey(workspaceId: string, key: string) {
    return this.prisma.customFieldDefinition.findFirst({
      where: {
        workspaceId,
        key,
        deletedAt: null,
      },
    });
  }

  async findByKeyInScope(
    workspaceId: string,
    key: string,
    scope: {
      spaceId: string | null;
      folderId: string | null;
      listId: string | null;
      customTaskTypeId: string | null;
    },
  ) {
    return this.prisma.customFieldDefinition.findFirst({
      where: {
        workspaceId,
        key,
        spaceId: scope.spaceId,
        folderId: scope.folderId,
        listId: scope.listId,
        customTaskTypeId: scope.customTaskTypeId,
        deletedAt: null,
      },
    });
  }

  async create(data: CreateData) {
    return this.prisma.customFieldDefinition.create({
      data: {
        workspaceId: data.workspaceId,
        key: data.key,
        name: data.name,
        label: data.label,
        description: data.description ?? null,
        type: data.type,
        required: data.required,
        options: data.options,
        config: data.config ?? Prisma.JsonNull,
        defaultValue:
          data.defaultValue === undefined
            ? Prisma.JsonNull
            : (data.defaultValue ?? Prisma.JsonNull),
        validation:
          data.validation === undefined
            ? Prisma.JsonNull
            : (data.validation ?? Prisma.JsonNull),
        pinned: data.pinned ?? false,
        visibleToGuests: data.visibleToGuests ?? true,
        fillMethod: data.fillMethod ?? 'manual',
        sortOrder: data.sortOrder,
        isBuiltin: false,
        createdById: data.createdById ?? null,
        spaceId: data.spaceId ?? null,
        folderId: data.folderId ?? null,
        listId: data.listId ?? null,
        customTaskTypeId: data.customTaskTypeId ?? null,
        groupId: data.groupId ?? null,
        groupName: data.groupName ?? null,
        groupPosition: data.groupPosition ?? null,
        groupColor: data.groupColor ?? null,
      },
      include: DEFINITION_INCLUDE,
    });
  }

  async findAllVisible(workspaceId: string) {
    return this.prisma.customFieldDefinition.findMany({
      where: {
        deletedAt: null,
        OR: [{ workspaceId }, { workspaceId: null }],
      },
      orderBy: [{ isBuiltin: 'desc' }, { sortOrder: 'asc' }, { key: 'asc' }],
      include: DEFINITION_INCLUDE,
    });
  }

  async update(id: string, data: UpdateData) {
    return this.prisma.customFieldDefinition.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.label !== undefined ? { label: data.label } : {}),
        ...(data.description !== undefined
          ? { description: data.description }
          : {}),
        ...(data.required !== undefined ? { required: data.required } : {}),
        ...(data.options !== undefined ? { options: data.options } : {}),
        ...(data.config !== undefined
          ? { config: data.config ?? Prisma.JsonNull }
          : {}),
        ...(data.defaultValue !== undefined
          ? { defaultValue: data.defaultValue ?? Prisma.JsonNull }
          : {}),
        ...(data.validation !== undefined
          ? { validation: data.validation ?? Prisma.JsonNull }
          : {}),
        ...(data.pinned !== undefined ? { pinned: data.pinned } : {}),
        ...(data.visibleToGuests !== undefined
          ? { visibleToGuests: data.visibleToGuests }
          : {}),
        ...(data.fillMethod !== undefined
          ? { fillMethod: data.fillMethod }
          : {}),
        ...(data.sortOrder !== undefined ? { sortOrder: data.sortOrder } : {}),
        ...(data.groupId !== undefined ? { groupId: data.groupId } : {}),
        ...(data.groupName !== undefined ? { groupName: data.groupName } : {}),
        ...(data.groupPosition !== undefined
          ? { groupPosition: data.groupPosition }
          : {}),
        ...(data.groupColor !== undefined
          ? { groupColor: data.groupColor }
          : {}),
      },
      include: DEFINITION_INCLUDE,
    });
  }

  async softDelete(id: string) {
    return this.prisma.customFieldDefinition.update({
      where: { id },
      data: { deletedAt: new Date() },
      include: DEFINITION_INCLUDE,
    });
  }

  async countValues(definitionId: string): Promise<number> {
    return this.prisma.customFieldValue.count({
      where: { definitionId },
    });
  }

  async countValuesByDefinition(
    definitionIds: string[],
  ): Promise<Map<string, number>> {
    if (definitionIds.length === 0) return new Map();
    const rows = await this.prisma.customFieldValue.groupBy({
      by: ['definitionId'],
      where: { definitionId: { in: definitionIds } },
      _count: { _all: true },
    });
    const map = new Map<string, number>();
    for (const row of rows) {
      map.set(row.definitionId, row._count._all);
    }
    return map;
  }

  async findListHierarchy(
    workspaceId: string,
    listId: string,
  ): Promise<{
    listId: string;
    folderId: string | null;
    spaceId: string | null;
  } | null> {
    const list = await this.prisma.list.findFirst({
      where: {
        id: listId,
        OR: [
          { space: { workspaceId } },
          { folder: { space: { workspaceId } } },
        ],
      },
      select: {
        id: true,
        folderId: true,
        spaceId: true,
        folder: { select: { spaceId: true } },
      },
    });
    if (!list) return null;
    return {
      listId: list.id,
      folderId: list.folderId,
      spaceId: list.spaceId ?? list.folder?.spaceId ?? null,
    };
  }

  async findFolderHierarchy(
    workspaceId: string,
    folderId: string,
  ): Promise<{ folderId: string; spaceId: string } | null> {
    const folder = await this.prisma.folder.findFirst({
      where: { id: folderId, space: { workspaceId } },
      select: { id: true, spaceId: true },
    });
    if (!folder) return null;
    return { folderId: folder.id, spaceId: folder.spaceId };
  }


  async findTaskTypesForDefinitions(
    definitionIds: string[],
  ): Promise<Map<string, { id: string; name: string }>> {
    if (definitionIds.length === 0) return new Map();
    const defs = await this.prisma.customFieldDefinition.findMany({
      where: { id: { in: definitionIds }, customTaskTypeId: { not: null } },
      select: {
        id: true,
        customTaskType: { select: { id: true, name: true } },
      },
    });
    const map = new Map<string, { id: string; name: string }>();
    for (const def of defs) {
      if (def.customTaskType) {
        map.set(def.id, def.customTaskType);
      }
    }
    return map;
  }

  async addLocationLink(
    customFieldId: string,
    locationType: 'list' | 'folder' | 'space',
    targetId: string,
    groupId: string | null,
  ): Promise<void> {
    if (locationType === 'list') {
      await this.prisma.customFieldList.upsert({
        where: { customFieldId_listId: { customFieldId, listId: targetId } },
        update: {},
        create: { customFieldId, listId: targetId, groupId },
      });
      return;
    }
    if (locationType === 'folder') {
      await this.prisma.customFieldFolder.upsert({
        where: {
          customFieldId_folderId: { customFieldId, folderId: targetId },
        },
        update: {},
        create: { customFieldId, folderId: targetId, groupId },
      });
      return;
    }
    await this.prisma.customFieldSpace.upsert({
      where: { customFieldId_spaceId: { customFieldId, spaceId: targetId } },
      update: {},
      create: { customFieldId, spaceId: targetId, groupId },
    });
  }

  async removeLocationLink(
    customFieldId: string,
    locationType: 'list' | 'folder' | 'space',
    targetId: string,
  ): Promise<number> {
    if (locationType === 'list') {
      const r = await this.prisma.customFieldList.deleteMany({
        where: { customFieldId, listId: targetId },
      });
      return r.count;
    }
    if (locationType === 'folder') {
      const r = await this.prisma.customFieldFolder.deleteMany({
        where: { customFieldId, folderId: targetId },
      });
      return r.count;
    }
    const r = await this.prisma.customFieldSpace.deleteMany({
      where: { customFieldId, spaceId: targetId },
    });
    return r.count;
  }

  async findScopeLinks(defIds: string[]): Promise<
    Map<string, { listIds: string[]; folderIds: string[]; spaceIds: string[] }>
  > {
    const map = new Map<
      string,
      { listIds: string[]; folderIds: string[]; spaceIds: string[] }
    >();
    if (defIds.length === 0) return map;
    const [lists, folders, spaces] = await Promise.all([
      this.prisma.customFieldList.findMany({
        where: { customFieldId: { in: defIds } },
        select: { customFieldId: true, listId: true },
      }),
      this.prisma.customFieldFolder.findMany({
        where: { customFieldId: { in: defIds } },
        select: { customFieldId: true, folderId: true },
      }),
      this.prisma.customFieldSpace.findMany({
        where: { customFieldId: { in: defIds } },
        select: { customFieldId: true, spaceId: true },
      }),
    ]);
    const ensure = (id: string) => {
      let e = map.get(id);
      if (!e) {
        e = { listIds: [], folderIds: [], spaceIds: [] };
        map.set(id, e);
      }
      return e;
    };
    for (const r of lists) ensure(r.customFieldId).listIds.push(r.listId);
    for (const r of folders) ensure(r.customFieldId).folderIds.push(r.folderId);
    for (const r of spaces) ensure(r.customFieldId).spaceIds.push(r.spaceId);
    return map;
  }

  async findLocationLinks(customFieldId: string): Promise<{
    lists: Array<{
      id: string;
      customFieldId: string;
      listId: string;
      groupId: string | null;
      createdAt: Date;
      updatedAt: Date;
    }>;
    folders: Array<{
      id: string;
      customFieldId: string;
      folderId: string;
      groupId: string | null;
      createdAt: Date;
      updatedAt: Date;
    }>;
    spaces: Array<{
      id: string;
      customFieldId: string;
      spaceId: string;
      groupId: string | null;
      createdAt: Date;
      updatedAt: Date;
    }>;
  }> {
    const [lists, folders, spaces] = await Promise.all([
      this.prisma.customFieldList.findMany({ where: { customFieldId } }),
      this.prisma.customFieldFolder.findMany({ where: { customFieldId } }),
      this.prisma.customFieldSpace.findMany({ where: { customFieldId } }),
    ]);
    return { lists, folders, spaces };
  }
}

export type CustomFieldDefinitionWithCreator = Awaited<
  ReturnType<CustomFieldDefinitionsRepository['findAllVisible']>
>[number];

export type { CustomFieldDefinition };
