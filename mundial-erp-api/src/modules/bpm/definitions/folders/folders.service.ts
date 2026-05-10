import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { ProcessType } from '@prisma/client';
import { FoldersRepository } from './folders.repository';
import { CreateFolderDto } from './dto/create-folder.dto';
import { UpdateFolderDto } from './dto/update-folder.dto';
import { FolderResponseDto } from './dto/folder-response.dto';
import { PrismaService } from '../../../../database/prisma.service';
import { WorkflowStatusesService } from '../workflow-statuses/workflow-statuses.service';
import { SpacesRepository } from '../spaces/spaces.repository';

@Injectable()
export class FoldersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly foldersRepository: FoldersRepository,
    private readonly spacesRepository: SpacesRepository,
    @Inject(forwardRef(() => WorkflowStatusesService))
    private readonly workflowStatusesService: WorkflowStatusesService,
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

  private async assertSpaceInWorkspace(
    workspaceId: string,
    spaceId: string,
  ) {
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
      await this.workflowStatusesService.copyStatusesToFolder(
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

  async findById(workspaceId: string, id: string): Promise<FolderResponseDto> {
    const entity = await this.foldersRepository.findById(workspaceId, id);
    if (!entity) {
      throw new NotFoundException('Folder não encontrado');
    }
    return FolderResponseDto.fromEntity(entity);
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

    const updated = await this.foldersRepository.update(
      workspaceId,
      id,
      updateData,
    );

    if (dto.useSpaceStatuses === false && entity.useSpaceStatuses === true) {
      await this.workflowStatusesService.copyStatusesToFolder(
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

  async remove(
    workspaceId: string,
    id: string,
  ): Promise<{ message: string }> {
    const entity = await this.foldersRepository.findById(workspaceId, id);
    if (!entity) {
      throw new NotFoundException('Folder não encontrado');
    }
    if (entity.isDefault) {
      throw new BadRequestException(
        'Não é possível excluir um folder padrão',
      );
    }
    await this.foldersRepository.softDelete(workspaceId, id);
    return { message: 'Folder deleted successfully' };
  }
}
