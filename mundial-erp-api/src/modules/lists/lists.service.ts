import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MemberPermission, Prisma, Visibility } from '@prisma/client';
import { ListsRepository } from './lists.repository';
import { CreateListDto } from './dto/create-list.dto';
import { UpdateListDto } from './dto/update-list.dto';
import { ListResponseDto } from './dto/list-response.dto';
import { PrismaService } from '../../database/prisma.service';
import { SpacesRepository } from '../spaces/spaces.repository';
import { SPACE_RESOURCES } from '../spaces/resources-metadata';

@Injectable()
export class ListsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly listsRepository: ListsRepository,
    private readonly spacesRepository: SpacesRepository,
  ) {}

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  private async resolveUniqueSlug(
    workspaceId: string,
    baseSlug: string,
  ): Promise<string> {
    let slug = baseSlug;
    let suffix = 0;
    while (await this.listsRepository.findBySlug(workspaceId, slug)) {
      suffix++;
      slug = `${baseSlug}-${suffix}`;
    }
    return slug;
  }

  async create(
    workspaceId: string,
    creatorId: string,
    dto: CreateListDto,
  ): Promise<ListResponseDto> {
    const folder = await this.listsRepository.findFolderById(
      workspaceId,
      dto.folderId,
    );
    if (!folder) {
      throw new NotFoundException('Folder não encontrado');
    }

    const baseSlug = this.generateSlug(dto.name);
    const slug = await this.resolveUniqueSlug(workspaceId, baseSlug);

    const createData: Prisma.ListCreateInput = {
      name: dto.name,
      slug,
      description: dto.description,
      isPrivate: dto.isPrivate ?? false,
      processType: dto.processType ?? 'LIST',
      status: dto.status,
      position: dto.sortOrder ?? 0,
      creator: { connect: { id: creatorId } },
      folder: { connect: { id: dto.folderId } },
      space: { connect: { id: folder.spaceId } },
    };
    if (dto.defaultTaskTypeId) {
      createData.defaultTaskType = { connect: { id: dto.defaultTaskTypeId } };
    }

    const entity = await this.listsRepository.createWithDefaultView(
      workspaceId,
      createData,
    );

    return ListResponseDto.fromEntity(entity);
  }

  async findAllScoped(
    workspaceId: string,
    scope: { folderId?: string; spaceId?: string },
  ) {
    if (!scope.folderId && !scope.spaceId) {
      throw new BadRequestException(
        'folderId ou spaceId é obrigatório na query',
      );
    }
    const where: Prisma.ListWhereInput = {
      deletedAt: null,
      space: { workspaceId },
    };
    if (scope.folderId) where.folderId = scope.folderId;
    if (scope.spaceId) where.spaceId = scope.spaceId;
    const items = await this.prisma.list.findMany({
      where,
      orderBy: { position: 'asc' },
    });
    return items.map(ListResponseDto.fromEntity);
  }

  async findById(workspaceId: string, id: string): Promise<ListResponseDto> {
    const entity = await this.listsRepository.findById(workspaceId, id);
    if (!entity) {
      throw new NotFoundException('List não encontrada');
    }
    return ListResponseDto.fromEntity(entity);
  }

  async update(
    workspaceId: string,
    id: string,
    dto: UpdateListDto,
  ): Promise<ListResponseDto> {
    const entity = await this.listsRepository.findById(workspaceId, id);
    if (!entity) {
      throw new NotFoundException('List não encontrada');
    }

    const updateData: Record<string, any> = {};
    if (dto.name !== undefined) {
      updateData.name = dto.name;
      const baseSlug = this.generateSlug(dto.name);
      const existingSlug = await this.listsRepository.findBySlug(
        workspaceId,
        baseSlug,
      );
      if (!existingSlug || existingSlug.id === id) {
        updateData.slug = baseSlug;
      } else {
        updateData.slug = await this.resolveUniqueSlug(workspaceId, baseSlug);
      }
    }
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.isPrivate !== undefined) updateData.isPrivate = dto.isPrivate;
    if (dto.status !== undefined) updateData.status = dto.status;
    if (dto.sortOrder !== undefined) updateData.position = dto.sortOrder;
    if (dto.defaultTaskTypeId !== undefined)
      updateData.defaultTaskTypeId = dto.defaultTaskTypeId;

    const updated = await this.listsRepository.update(
      workspaceId,
      id,
      updateData,
    );
    return ListResponseDto.fromEntity(updated);
  }

  async getResources(workspaceId: string, listId: string) {
    const list = await this.listsRepository.findById(workspaceId, listId);
    if (!list) {
      throw new NotFoundException('List não encontrada');
    }
    return SPACE_RESOURCES;
  }

  async getVisibility(workspaceId: string, listId: string) {
    const list = await this.listsRepository.findById(workspaceId, listId);
    if (!list) {
      throw new NotFoundException('List não encontrada');
    }
    return { visibility: list.visibility };
  }

  async updateVisibility(
    workspaceId: string,
    listId: string,
    visibility: Visibility,
  ) {
    const list = await this.listsRepository.findById(workspaceId, listId);
    if (!list) {
      throw new NotFoundException('List não encontrada');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.list.update({
        where: { id: listId },
        data: { visibility },
      });

      const becamePrivate =
        list.visibility === Visibility.PUBLIC &&
        visibility === Visibility.PRIVATE;

      if (becamePrivate && list.creatorId) {
        await tx.listMember.upsert({
          where: {
            listId_userId: { listId, userId: list.creatorId },
          },
          create: {
            listId,
            userId: list.creatorId,
            permission: MemberPermission.FULL_EDIT,
          },
          update: { permission: MemberPermission.FULL_EDIT },
        });
      }
    });

    return { visibility };
  }

  async listMembers(workspaceId: string, listId: string) {
    const list = await this.listsRepository.findById(workspaceId, listId);
    if (!list) {
      throw new NotFoundException('List não encontrada');
    }

    const direct = await this.prisma.listMember.findMany({
      where: { listId },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    const directRows = direct.map((m) => ({
      listId,
      userId: m.userId,
      permission: m.permission,
      source: 'direct' as const,
      inherited: false,
      user: { ...m.user, avatar: null },
    }));

    if (list.visibility !== Visibility.PUBLIC) {
      return directRows;
    }

    const directIds = new Set(direct.map((m) => m.userId));

    if (list.folderId) {
      const folderMembers = await this.prisma.folderMember.findMany({
        where: { folderId: list.folderId },
        include: { user: { select: { id: true, name: true, email: true } } },
      });
      const inheritedRows = folderMembers
        .filter((fm) => !directIds.has(fm.userId))
        .map((fm) => ({
          listId,
          userId: fm.userId,
          permission: fm.permission,
          source: 'folder' as const,
          inherited: true,
          user: { ...fm.user, avatar: null },
        }));
      return [...directRows, ...inheritedRows];
    }

    if (list.spaceId) {
      const spaceMembers = await this.prisma.spaceMember.findMany({
        where: { spaceId: list.spaceId },
        include: { user: { select: { id: true, name: true, email: true } } },
      });
      const inheritedRows = spaceMembers
        .filter((sm) => !directIds.has(sm.userId))
        .map((sm) => ({
          listId,
          userId: sm.userId,
          permission: sm.permission,
          source: 'space' as const,
          inherited: true,
          user: { ...sm.user, avatar: null },
        }));
      return [...directRows, ...inheritedRows];
    }

    return directRows;
  }

  async addMember(
    workspaceId: string,
    listId: string,
    userId: string,
    permission: MemberPermission,
  ) {
    const list = await this.listsRepository.findById(workspaceId, listId);
    if (!list) {
      throw new NotFoundException('List não encontrada');
    }
    const isWsMember = await this.prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
    });
    if (!isWsMember) {
      throw new NotFoundException('User não pertence ao workspace');
    }
    try {
      await this.prisma.listMember.create({
        data: { listId, userId, permission },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new BadRequestException('User já é membro da list');
      }
      throw error;
    }
    return { listId, userId, permission, source: 'direct', inherited: false };
  }

  async updateMember(
    workspaceId: string,
    listId: string,
    userId: string,
    permission: MemberPermission,
  ) {
    const list = await this.listsRepository.findById(workspaceId, listId);
    if (!list) {
      throw new NotFoundException('List não encontrada');
    }
    const existing = await this.prisma.listMember.findUnique({
      where: { listId_userId: { listId, userId } },
    });
    if (!existing) {
      throw new NotFoundException('Membro não encontrado');
    }
    await this.prisma.listMember.update({
      where: { listId_userId: { listId, userId } },
      data: { permission },
    });
    return { listId, userId, permission, source: 'direct', inherited: false };
  }

  async removeMember(workspaceId: string, listId: string, userId: string) {
    const list = await this.listsRepository.findById(workspaceId, listId);
    if (!list) {
      throw new NotFoundException('List não encontrada');
    }
    const existing = await this.prisma.listMember.findUnique({
      where: { listId_userId: { listId, userId } },
    });
    if (!existing) {
      throw new NotFoundException('Membro não encontrado');
    }
    await this.prisma.listMember.delete({
      where: { listId_userId: { listId, userId } },
    });
  }

  async remove(
    workspaceId: string,
    id: string,
  ): Promise<{ message: string }> {
    const entity = await this.listsRepository.findById(workspaceId, id);
    if (!entity) {
      throw new NotFoundException('List não encontrada');
    }
    await this.listsRepository.softDelete(workspaceId, id);
    return { message: 'List deleted successfully' };
  }

  async listStatuses(workspaceId: string, listId: string) {
    const list = await this.listsRepository.findById(workspaceId, listId);
    if (!list) {
      throw new NotFoundException('List não encontrada');
    }
    return this.prisma.status.findMany({
      where: { listId, deletedAt: null },
      orderBy: { position: 'asc' },
    });
  }

  async replaceStatuses(
    workspaceId: string,
    listId: string,
    statusInheritance: 'SPACE' | 'FOLDER' | 'CUSTOM',
    items: Array<{
      id?: string;
      name: string;
      type: 'NOT_STARTED' | 'ACTIVE' | 'DONE' | 'CLOSED';
      color: string;
      position: number;
    }>,
  ) {
    const list = await this.listsRepository.findById(workspaceId, listId);
    if (!list) {
      throw new NotFoundException('List não encontrada');
    }
    return this.prisma.$transaction(async (tx) => {
      await tx.list.update({
        where: { id: listId },
        data: { statusInheritance },
      });
      if (statusInheritance !== 'CUSTOM') {
        await tx.status.updateMany({
          where: { listId, deletedAt: null },
          data: { deletedAt: new Date() },
        });
        return { statusInheritance, statuses: [] };
      }
      const existing = await tx.status.findMany({
        where: { listId, deletedAt: null },
        select: { id: true },
      });
      const keptIds = new Set(
        items.filter((s) => s.id !== undefined).map((s) => s.id as string),
      );
      const toRemove = existing
        .map((e) => e.id)
        .filter((id) => !keptIds.has(id));
      if (toRemove.length > 0) {
        await tx.status.updateMany({
          where: { id: { in: toRemove } },
          data: { deletedAt: new Date() },
        });
      }
      for (const item of items) {
        if (item.id) {
          await tx.status.update({
            where: { id: item.id },
            data: {
              name: item.name,
              type: item.type,
              color: item.color,
              position: item.position,
            },
          });
        } else {
          await tx.status.create({
            data: {
              listId,
              name: item.name,
              type: item.type,
              color: item.color,
              position: item.position,
            },
          });
        }
      }
      const statuses = await tx.status.findMany({
        where: { listId, deletedAt: null },
        orderBy: { position: 'asc' },
      });
      return { statusInheritance, statuses };
    });
  }
}
