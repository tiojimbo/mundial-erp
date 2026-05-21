import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CreateStatusDto } from './dto/create-status.dto';

@Injectable()
export class StatusRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(_workspaceId: string, dto: CreateStatusDto) {
    const data: Prisma.StatusCreateInput = {
      type: dto.type,
      name: dto.name,
      color: dto.color,
      position: dto.position,
      list: dto.listId ? { connect: { id: dto.listId } } : undefined,
      folder: dto.folderId ? { connect: { id: dto.folderId } } : undefined,
      space: dto.spaceId ? { connect: { id: dto.spaceId } } : undefined,
    };
    return this.prisma.status.create({ data });
  }

  async findById(workspaceId: string, id: string) {
    return this.prisma.status.findFirst({
      where: this.scopedWhere(workspaceId, { id, deletedAt: null }),
    });
  }

  async findByIdWithTasks(workspaceId: string, id: string) {
    return this.prisma.status.findFirst({
      where: this.scopedWhere(workspaceId, { id, deletedAt: null }),
      include: {
        workItems: {
          where: { deletedAt: null },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });
  }

  async findByList(workspaceId: string, listId: string) {
    const list = await this.prisma.list.findFirst({
      where: { id: listId, deletedAt: null },
      select: {
        spaceId: true,
        folderId: true,
        statusInheritance: true,
        folder: {
          select: {
            spaceId: true,
            statusInheritance: true,
          },
        },
      },
    });
    if (!list) return [];

    const scope = this.resolveListStatusScope(listId, list);
    return this.prisma.status.findMany({
      where: this.scopedWhere(workspaceId, { ...scope, deletedAt: null }),
      orderBy: { position: 'asc' },
    });
  }

  private resolveListStatusScope(
    listId: string,
    list: {
      spaceId: string | null;
      folderId: string | null;
      statusInheritance: 'SPACE' | 'FOLDER' | 'CUSTOM';
      folder: {
        spaceId: string | null;
        statusInheritance: 'SPACE' | 'FOLDER' | 'CUSTOM';
      } | null;
    },
  ): Prisma.StatusWhereInput {
    if (list.statusInheritance === 'CUSTOM') {
      return { listId };
    }
    if (list.statusInheritance === 'SPACE') {
      return { spaceId: list.spaceId, folderId: null, listId: null };
    }
    const folder = list.folder;
    if (folder && folder.statusInheritance === 'CUSTOM' && list.folderId) {
      return { folderId: list.folderId, listId: null };
    }
    const spaceId = folder?.spaceId ?? list.spaceId;
    return { spaceId, folderId: null, listId: null };
  }

  async findBySpace(workspaceId: string, spaceId: string) {
    return this.prisma.status.findMany({
      where: this.scopedWhere(workspaceId, {
        spaceId,
        folderId: null,
        listId: null,
        deletedAt: null,
      }),
      orderBy: { position: 'asc' },
    });
  }

  async findByFolder(workspaceId: string, folderId: string) {
    return this.prisma.status.findMany({
      where: this.scopedWhere(workspaceId, {
        folderId,
        listId: null,
        deletedAt: null,
      }),
      orderBy: { position: 'asc' },
    });
  }

  async update(
    _workspaceId: string,
    id: string,
    data: Prisma.StatusUpdateInput,
  ) {
    return this.prisma.status.update({ where: { id }, data });
  }

  async softDelete(_workspaceId: string, id: string) {
    return this.prisma.status.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async findListById(workspaceId: string, listId: string) {
    return this.prisma.list.findFirst({
      where: {
        id: listId,
        deletedAt: null,
        OR: [
          { space: { workspaceId } },
          { folder: { space: { workspaceId } } },
        ],
      },
      select: { id: true },
    });
  }

  findRequiredFieldsByStatusId(_workspaceId: string, statusId: string) {
    return this.prisma.statusRequiredField.findMany({
      where: { statusId },
      orderBy: { createdAt: 'asc' },
      include: { customField: true },
    });
  }

  async replaceRequiredFields(
    _workspaceId: string,
    statusId: string,
    customFieldIds: string[],
  ) {
    await this.prisma.$transaction([
      this.prisma.statusRequiredField.deleteMany({ where: { statusId } }),
      ...(customFieldIds.length > 0
        ? [
            this.prisma.statusRequiredField.createMany({
              data: customFieldIds.map((customFieldId) => ({
                statusId,
                customFieldId,
              })),
            }),
          ]
        : []),
    ]);
    return this.findRequiredFieldsByStatusId(_workspaceId, statusId);
  }

  async copySpaceStatusesToFolder(
    workspaceId: string,
    spaceId: string,
    folderId: string,
  ) {
    const spaceStatuses = await this.prisma.status.findMany({
      where: this.scopedWhere(workspaceId, {
        spaceId,
        folderId: null,
        listId: null,
        deletedAt: null,
      }),
      orderBy: { position: 'asc' },
    });

    const creates = spaceStatuses.map((s) =>
      this.prisma.status.create({
        data: {
          type: s.type,
          name: s.name,
          color: s.color,
          position: s.position,
          space: { connect: { id: spaceId } },
          folder: { connect: { id: folderId } },
        },
      }),
    );

    return this.prisma.$transaction(creates);
  }

  private scopedWhere(
    workspaceId: string,
    base: Prisma.StatusWhereInput,
  ): Prisma.StatusWhereInput {
    return {
      ...base,
      OR: [
        { space: { workspaceId } },
        { folder: { space: { workspaceId } } },
        {
          list: {
            OR: [
              { space: { workspaceId } },
              { folder: { space: { workspaceId } } },
            ],
          },
        },
      ],
    };
  }
}
