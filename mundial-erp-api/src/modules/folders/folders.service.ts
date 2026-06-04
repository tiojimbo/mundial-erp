import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import {
  MemberPermission,
  Prisma,
  ProcessType,
  Visibility,
  WorkspaceMemberRole,
} from '@prisma/client';
import { FoldersRepository } from './folders.repository';
import { CreateFolderDto } from './dto/create-folder.dto';
import { UpdateFolderDto } from './dto/update-folder.dto';
import { FolderResponseDto } from './dto/folder-response.dto';
import { FolderDetailDto } from './dto/folder-detail.dto';
import { PrismaService } from '../../database/prisma.service';
import { StatusService } from '../status/status.service';
import { SpacesRepository } from '../spaces/spaces.repository';
import { SPACE_RESOURCES } from '../spaces/resources-metadata';

@Injectable()
export class FoldersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly foldersRepository: FoldersRepository,
    private readonly spacesRepository: SpacesRepository,
    @Inject(forwardRef(() => StatusService))
    private readonly statusService: StatusService,
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
    while (await this.foldersRepository.findBySlug(workspaceId, slug)) {
      suffix++;
      slug = `${baseSlug}-${suffix}`;
    }
    return slug;
  }

  private async assertSpaceInWorkspace(workspaceId: string, spaceId: string) {
    const space = await this.spacesRepository.findById(workspaceId, spaceId);
    if (!space) {
      throw new NotFoundException('Space não encontrado');
    }
  }

  async create(
    workspaceId: string,
    creatorId: string,
    dto: CreateFolderDto,
  ): Promise<FolderResponseDto> {
    await this.assertSpaceInWorkspace(workspaceId, dto.spaceId);

    const baseSlug = this.generateSlug(dto.name);
    const slug = await this.resolveUniqueSlug(workspaceId, baseSlug);

    const useSpaceStatuses = dto.useSpaceStatuses ?? true;

    const entity = await this.prisma.$transaction(async (tx) => {
      const folder = await tx.folder.create({
        data: {
          name: dto.name,
          slug,
          description: dto.description,
          isPrivate: dto.isPrivate ?? false,
          icon: dto.icon,
          color: dto.color,
          useSpaceStatuses,
          position: dto.sortOrder ?? 0,
          space: { connect: { id: dto.spaceId } },
          creator: { connect: { id: creatorId } },
        },
      });

      await tx.list.create({
        data: {
          name: 'Lista padrão',
          slug: `${slug}-default-list`,
          processType: ProcessType.LIST,
          position: 0,
          folder: { connect: { id: folder.id } },
          space: { connect: { id: dto.spaceId } },
          creator: { connect: { id: creatorId } },
        },
      });

      return folder;
    });

    if (!useSpaceStatuses) {
      await this.statusService.copyStatusesToFolder(
        workspaceId,
        dto.spaceId,
        entity.id,
      );
    }

    return FolderResponseDto.fromEntity(entity);
  }

  async findAllBySpace(workspaceId: string, spaceId: string) {
    if (!spaceId) {
      throw new BadRequestException('spaceId é obrigatório na query');
    }
    await this.assertSpaceInWorkspace(workspaceId, spaceId);
    const items = await this.prisma.folder.findMany({
      where: { spaceId, deletedAt: null, space: { workspaceId } },
      orderBy: { position: 'asc' },
      include: { space: { select: { id: true, name: true } } },
    });
    return items.map(FolderResponseDto.fromEntity);
  }

  async findById(workspaceId: string, id: string): Promise<FolderDetailDto> {
    const entity = await this.foldersRepository.findByIdWithDetails(
      workspaceId,
      id,
    );
    if (!entity) {
      throw new NotFoundException('Folder não encontrado');
    }
    return FolderDetailDto.fromEntity(entity);
  }

  async update(
    workspaceId: string,
    id: string,
    dto: UpdateFolderDto,
  ): Promise<FolderResponseDto> {
    const entity = await this.foldersRepository.findById(workspaceId, id);
    if (!entity) {
      throw new NotFoundException('Folder não encontrado');
    }

    const updateData: Record<string, any> = {};
    if (dto.name !== undefined) {
      updateData.name = dto.name;
      const baseSlug = this.generateSlug(dto.name);
      const existingSlug = await this.foldersRepository.findBySlug(
        workspaceId,
        baseSlug,
      );
      if (!existingSlug || existingSlug.id === id) {
        updateData.slug = baseSlug;
      } else {
        updateData.slug = await this.resolveUniqueSlug(workspaceId, baseSlug);
      }
    }
    if (dto.spaceId !== undefined) {
      await this.assertSpaceInWorkspace(workspaceId, dto.spaceId);
      updateData.space = { connect: { id: dto.spaceId } };
    }
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.isPrivate !== undefined) updateData.isPrivate = dto.isPrivate;
    if (dto.icon !== undefined) updateData.icon = dto.icon;
    if (dto.color !== undefined) updateData.color = dto.color;
    if (dto.useSpaceStatuses !== undefined)
      updateData.useSpaceStatuses = dto.useSpaceStatuses;
    if (dto.sortOrder !== undefined) updateData.position = dto.sortOrder;
    if (dto.defaultTaskTypeId !== undefined)
      updateData.defaultTaskTypeId = dto.defaultTaskTypeId;

    const updated = await this.foldersRepository.update(
      workspaceId,
      id,
      updateData,
    );

    if (dto.useSpaceStatuses === false && entity.useSpaceStatuses === true) {
      await this.statusService.copyStatusesToFolder(
        workspaceId,
        entity.spaceId,
        id,
      );
    }

    return FolderResponseDto.fromEntity(updated);
  }

  async getProcessSummaries(
    workspaceId: string,
    folderId: string,
    showClosed = false,
  ) {
    return this.foldersRepository.getProcessSummaries(
      workspaceId,
      folderId,
      showClosed,
    );
  }

  async findBySlug(workspaceId: string, slug: string) {
    const entity = await this.foldersRepository.findBySlugWithDetails(
      workspaceId,
      slug,
    );
    if (!entity) {
      throw new NotFoundException('Folder não encontrado');
    }

    return {
      ...FolderResponseDto.fromEntity(entity),
      departmentName: entity.space.name,
      departmentSlug: entity.space.slug,
      processes: entity.lists.map((proc) => ({
        id: proc.id,
        name: proc.name,
        slug: proc.slug,
        processType: proc.processType,
        featureRoute: proc.featureRoute,
        description: proc.description,
        isPrivate: proc.isPrivate,
      })),
    };
  }

  async getResources(workspaceId: string, folderId: string) {
    const folder = await this.foldersRepository.findById(workspaceId, folderId);
    if (!folder) {
      throw new NotFoundException('Folder não encontrado');
    }
    return SPACE_RESOURCES;
  }

  async getVisibility(workspaceId: string, folderId: string) {
    const folder = await this.foldersRepository.findById(workspaceId, folderId);
    if (!folder) {
      throw new NotFoundException('Folder não encontrado');
    }
    return { visibility: folder.visibility };
  }

  async updateVisibility(
    workspaceId: string,
    folderId: string,
    visibility: Visibility,
  ) {
    const folder = await this.foldersRepository.findById(workspaceId, folderId);
    if (!folder) {
      throw new NotFoundException('Folder não encontrado');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.folder.update({
        where: { id: folderId },
        data: { visibility },
      });

      const becamePrivate =
        folder.visibility === Visibility.PUBLIC &&
        visibility === Visibility.PRIVATE;

      if (becamePrivate && folder.creatorId) {
        await tx.folderMember.upsert({
          where: {
            folderId_userId: { folderId, userId: folder.creatorId },
          },
          create: {
            folderId,
            userId: folder.creatorId,
            permission: MemberPermission.FULL_EDIT,
          },
          update: { permission: MemberPermission.FULL_EDIT },
        });
      }
    });

    return { visibility };
  }

  async listMembers(workspaceId: string, folderId: string) {
    const folder = await this.foldersRepository.findById(workspaceId, folderId);
    if (!folder) {
      throw new NotFoundException('Folder não encontrado');
    }

    const direct = await this.prisma.folderMember.findMany({
      where: { folderId },
      include: {
        user: { select: { id: true, name: true, email: true, avatar: true } },
      },
    });

    const directRows = direct.map((m) => ({
      folderId,
      userId: m.userId,
      permission: m.permission,
      source: 'direct' as const,
      inherited: false,
      user: m.user,
    }));

    if (folder.visibility !== Visibility.PUBLIC) {
      return directRows;
    }

    const directIds = new Set(direct.map((m) => m.userId));
    const spaceMembers = await this.prisma.spaceMember.findMany({
      where: { spaceId: folder.spaceId },
      include: {
        user: { select: { id: true, name: true, email: true, avatar: true } },
      },
    });
    const inheritedRows = spaceMembers
      .filter((sm) => !directIds.has(sm.userId))
      .map((sm) => ({
        folderId,
        userId: sm.userId,
        permission: sm.permission,
        source: 'inherited' as const,
        inherited: true,
        user: sm.user,
      }));

    return [...directRows, ...inheritedRows];
  }

  private async assertCanManageMembers(
    workspaceId: string,
    folderId: string,
    actorId: string,
  ): Promise<void> {
    const wsMember = await this.prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: actorId } },
    });
    if (
      wsMember &&
      (wsMember.role === WorkspaceMemberRole.OWNER ||
        wsMember.role === WorkspaceMemberRole.ADMIN)
    ) {
      return;
    }
    const fm = await this.prisma.folderMember.findUnique({
      where: { folderId_userId: { folderId, userId: actorId } },
    });
    if (
      fm &&
      (fm.permission === MemberPermission.FULL_EDIT ||
        fm.permission === MemberPermission.EDIT)
    ) {
      return;
    }
    const folder = await this.prisma.folder.findFirst({
      where: { id: folderId, deletedAt: null, space: { workspaceId } },
      select: { spaceId: true, visibility: true },
    });
    if (folder && folder.visibility === Visibility.PUBLIC) {
      const sm = await this.prisma.spaceMember.findUnique({
        where: {
          spaceId_userId: { spaceId: folder.spaceId, userId: actorId },
        },
      });
      if (
        sm &&
        (sm.permission === MemberPermission.FULL_EDIT ||
          sm.permission === MemberPermission.EDIT)
      ) {
        return;
      }
    }
    throw new ForbiddenException(
      'Sem permissão para gerenciar membros deste folder',
    );
  }

  async addMember(
    workspaceId: string,
    folderId: string,
    userId: string,
    permission: MemberPermission,
    actorId: string,
  ) {
    await this.assertCanManageMembers(workspaceId, folderId, actorId);
    const folder = await this.foldersRepository.findById(workspaceId, folderId);
    if (!folder) {
      throw new NotFoundException('Folder não encontrado');
    }
    const isWsMember = await this.prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
    });
    if (!isWsMember) {
      throw new NotFoundException('User não pertence ao workspace');
    }
    try {
      await this.prisma.folderMember.create({
        data: { folderId, userId, permission },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('User já é membro do folder');
      }
      throw error;
    }
    return { folderId, userId, permission, source: 'direct', inherited: false };
  }

  async updateMember(
    workspaceId: string,
    folderId: string,
    userId: string,
    permission: MemberPermission,
    actorId: string,
  ) {
    await this.assertCanManageMembers(workspaceId, folderId, actorId);
    const folder = await this.foldersRepository.findById(workspaceId, folderId);
    if (!folder) {
      throw new NotFoundException('Folder não encontrado');
    }
    const existing = await this.prisma.folderMember.findUnique({
      where: { folderId_userId: { folderId, userId } },
    });
    if (!existing) {
      throw new NotFoundException('Membro não encontrado');
    }
    await this.prisma.folderMember.update({
      where: { folderId_userId: { folderId, userId } },
      data: { permission },
    });
    return { folderId, userId, permission, source: 'direct', inherited: false };
  }

  async removeMember(
    workspaceId: string,
    folderId: string,
    userId: string,
    actorId: string,
  ) {
    await this.assertCanManageMembers(workspaceId, folderId, actorId);
    const folder = await this.foldersRepository.findById(workspaceId, folderId);
    if (!folder) {
      throw new NotFoundException('Folder não encontrado');
    }
    const existing = await this.prisma.folderMember.findUnique({
      where: { folderId_userId: { folderId, userId } },
    });
    if (!existing) {
      throw new NotFoundException('Membro não encontrado');
    }
    await this.prisma.folderMember.delete({
      where: { folderId_userId: { folderId, userId } },
    });
  }

  async remove(workspaceId: string, id: string): Promise<{ message: string }> {
    const entity = await this.foldersRepository.findById(workspaceId, id);
    if (!entity) {
      throw new NotFoundException('Folder não encontrado');
    }
    await this.foldersRepository.softDelete(workspaceId, id);
    return { message: 'Folder deleted successfully' };
  }

  async listStatuses(workspaceId: string, folderId: string) {
    const folder = await this.foldersRepository.findById(workspaceId, folderId);
    if (!folder) {
      throw new NotFoundException('Folder não encontrado');
    }
    return this.prisma.status.findMany({
      where: { folderId, deletedAt: null },
      orderBy: { position: 'asc' },
    });
  }

  async replaceStatuses(
    workspaceId: string,
    folderId: string,
    statusInheritance: 'SPACE' | 'FOLDER' | 'CUSTOM',
    items: Array<{
      id?: string;
      name: string;
      type: 'NOT_STARTED' | 'ACTIVE' | 'DONE' | 'CLOSED';
      color: string;
      position: number;
    }>,
  ) {
    const folder = await this.foldersRepository.findById(workspaceId, folderId);
    if (!folder) {
      throw new NotFoundException('Folder não encontrado');
    }
    return this.prisma.$transaction(async (tx) => {
      await tx.folder.update({
        where: { id: folderId },
        data: {
          statusInheritance,
          useSpaceStatuses: statusInheritance === 'SPACE',
        },
      });
      if (statusInheritance !== 'CUSTOM') {
        await tx.status.updateMany({
          where: { folderId, deletedAt: null },
          data: { deletedAt: new Date() },
        });
        return { statusInheritance, statuses: [] };
      }
      const existing = await tx.status.findMany({
        where: { folderId, deletedAt: null },
        select: { id: true },
      });
      const ownIds = new Set(existing.map((e) => e.id));
      const keptOwnIds = new Set(
        items
          .filter((s) => s.id !== undefined && ownIds.has(s.id))
          .map((s) => s.id as string),
      );
      const toRemove = existing
        .map((e) => e.id)
        .filter((id) => !keptOwnIds.has(id));
      if (toRemove.length > 0) {
        await tx.status.updateMany({
          where: { id: { in: toRemove } },
          data: { deletedAt: new Date() },
        });
      }
      const statusIdRemap = new Map<string, string>();
      for (const item of items) {
        if (item.id && ownIds.has(item.id)) {
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
          const created = await tx.status.create({
            data: {
              folderId,
              name: item.name,
              type: item.type,
              color: item.color,
              position: item.position,
            },
          });
          if (item.id) statusIdRemap.set(item.id, created.id);
        }
      }
      for (const [oldId, newId] of statusIdRemap) {
        await tx.workItem.updateMany({
          where: {
            statusId: oldId,
            deletedAt: null,
            list: { folderId, statusInheritance: 'FOLDER' },
          },
          data: { statusId: newId },
        });
      }
      const statuses = await tx.status.findMany({
        where: { folderId, deletedAt: null },
        orderBy: { position: 'asc' },
      });
      return { statusInheritance, statuses };
    });
  }
}
