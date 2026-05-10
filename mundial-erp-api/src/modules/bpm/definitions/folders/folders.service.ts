import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { FoldersRepository } from './folders.repository';
import { CreateFolderDto } from './dto/create-folder.dto';
import { UpdateFolderDto } from './dto/update-folder.dto';
import { FolderResponseDto } from './dto/folder-response.dto';
import { PaginationDto } from '../../../../common/dtos/pagination.dto';
import { WorkflowStatusesService } from '../workflow-statuses/workflow-statuses.service';
import { SpacesRepository } from '../spaces/spaces.repository';

@Injectable()
export class FoldersService {
  constructor(
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
      throw new NotFoundException('Departamento não encontrado');
    }
  }

  async create(
    workspaceId: string,
    dto: CreateFolderDto,
  ): Promise<FolderResponseDto> {
    await this.assertSpaceInWorkspace(workspaceId, dto.spaceId);

    const baseSlug = this.generateSlug(dto.name);
    const slug = await this.resolveUniqueSlug(workspaceId, baseSlug);

    const useSpaceStatuses = dto.useSpaceStatuses ?? true;

    const entity = await this.foldersRepository.create(workspaceId, {
      name: dto.name,
      slug,
      description: dto.description,
      isPrivate: dto.isPrivate ?? false,
      icon: dto.icon,
      color: dto.color,
      useSpaceStatuses,
      position: dto.sortOrder ?? 0,
      space: { connect: { id: dto.spaceId } },
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

  async findAll(workspaceId: string, pagination: PaginationDto) {
    const { items, total } = await this.foldersRepository.findMany(workspaceId, {
      skip: pagination.skip,
      take: pagination.limit,
    });
    return {
      items: items.map(FolderResponseDto.fromEntity),
      total,
    };
  }

  async findById(workspaceId: string, id: string): Promise<FolderResponseDto> {
    const entity = await this.foldersRepository.findById(workspaceId, id);
    if (!entity) {
      throw new NotFoundException('Área não encontrada');
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
      throw new NotFoundException('Área não encontrada');
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
      throw new NotFoundException('Área não encontrada');
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

  async remove(workspaceId: string, id: string): Promise<void> {
    const entity = await this.foldersRepository.findById(workspaceId, id);
    if (!entity) {
      throw new NotFoundException('Área não encontrada');
    }
    if (entity.isDefault) {
      throw new BadRequestException('Não é possível excluir uma área padrão');
    }
    await this.foldersRepository.softDelete(workspaceId, id);
  }
}
