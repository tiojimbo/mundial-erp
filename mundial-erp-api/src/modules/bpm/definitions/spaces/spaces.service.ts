import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  MemberPermission,
  Prisma,
  ProcessType,
  StatusCategory,
} from '@prisma/client';
import { SpacesRepository } from './spaces.repository';
import { CreateSpaceDto } from './dto/create-space.dto';
import { UpdateSpaceDto } from './dto/update-space.dto';
import { SpaceResponseDto } from './dto/space-response.dto';
import { SpaceDetailDto } from './dto/space-detail.dto';
import { PaginationDto } from '../../../../common/dtos/pagination.dto';
import { PrismaService } from '../../../../database/prisma.service';

const DEFAULT_WORKFLOW_STATUSES = [
  { name: 'Para Fazer', category: StatusCategory.NOT_STARTED, color: '#94a3b8', sortOrder: 1 },
  { name: 'Em Andamento', category: StatusCategory.ACTIVE, color: '#3b82f6', sortOrder: 2 },
  { name: 'Concluído', category: StatusCategory.DONE, color: '#22c55e', sortOrder: 3 },
  { name: 'Finalizado', category: StatusCategory.CLOSED, color: '#16a34a', sortOrder: 4 },
] as const;

const DEFAULT_FOLDER_NAME = 'Lista padrão';
const DEFAULT_LIST_NAME = 'Lista padrão';

@Injectable()
export class SpacesService {
  constructor(
    private readonly prisma: PrismaService,
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
    while (await this.spacesRepository.slugExists(workspaceId, slug)) {
      suffix++;
      slug = `${baseSlug}-${suffix}`;
    }
    return slug;
  }

  async create(
    workspaceId: string,
    creatorId: string,
    dto: CreateSpaceDto,
  ): Promise<SpaceDetailDto> {
    const baseSlug = this.generateSlug(dto.name);
    const slug = await this.resolveUniqueSlug(workspaceId, baseSlug);

    try {
      const spaceId = await this.prisma.$transaction(async (tx) => {
        const created = await tx.space.create({
          data: {
            name: dto.name,
            slug,
            description: dto.description,
            icon: dto.icon,
            color: dto.color,
            isPrivate: dto.isPrivate,
            position: dto.sortOrder ?? 0,
            workspace: { connect: { id: workspaceId } },
            creator: { connect: { id: creatorId } },
          },
        });

        for (const status of DEFAULT_WORKFLOW_STATUSES) {
          await tx.workflowStatus.create({
            data: {
              name: status.name,
              category: status.category,
              color: status.color,
              sortOrder: status.sortOrder,
              isDefault: true,
              space: { connect: { id: created.id } },
            },
          });
        }

        const folder = await tx.folder.create({
          data: {
            name: DEFAULT_FOLDER_NAME,
            slug: `${slug}-default-folder`,
            isDefault: true,
            position: 0,
            space: { connect: { id: created.id } },
            creator: { connect: { id: creatorId } },
          },
        });

        await tx.list.create({
          data: {
            name: DEFAULT_LIST_NAME,
            slug: `${slug}-default-list`,
            processType: ProcessType.LIST,
            position: 0,
            folder: { connect: { id: folder.id } },
            space: { connect: { id: created.id } },
            creator: { connect: { id: creatorId } },
          },
        });

        await tx.spaceMember.create({
          data: {
            spaceId: created.id,
            userId: creatorId,
            permission: MemberPermission.FULL_EDIT,
          },
        });

        return created.id;
      });

      const entity = await this.spacesRepository.findByIdWithDefaults(
        workspaceId,
        spaceId,
      );
      if (!entity) {
        throw new NotFoundException('Space não encontrado');
      }
      return SpaceDetailDto.fromEntity(entity);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Space com este nome já existe');
      }
      throw error;
    }
  }

  async findAll(workspaceId: string, pagination: PaginationDto) {
    const { items, total } = await this.spacesRepository.findMany(
      workspaceId,
      {
        skip: pagination.skip,
        take: pagination.limit,
      },
    );
    return {
      items: items.map(SpaceResponseDto.fromEntity),
      total,
    };
  }

  async findById(
    workspaceId: string,
    id: string,
  ): Promise<SpaceResponseDto> {
    const entity = await this.spacesRepository.findById(workspaceId, id);
    if (!entity) {
      throw new NotFoundException('Space não encontrado');
    }
    return SpaceResponseDto.fromEntity(entity);
  }

  async update(
    workspaceId: string,
    id: string,
    dto: UpdateSpaceDto,
  ): Promise<SpaceResponseDto> {
    const entity = await this.spacesRepository.findById(workspaceId, id);
    if (!entity) {
      throw new NotFoundException('Space não encontrado');
    }

    const updateData: Record<string, any> = {};
    if (dto.name !== undefined) {
      updateData.name = dto.name;
      const baseSlug = this.generateSlug(dto.name);
      updateData.slug =
        entity.slug === baseSlug
          ? baseSlug
          : await this.resolveUniqueSlug(workspaceId, baseSlug);
    }
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.icon !== undefined) updateData.icon = dto.icon;
    if (dto.color !== undefined) updateData.color = dto.color;
    if (dto.isPrivate !== undefined) updateData.isPrivate = dto.isPrivate;
    if (dto.sortOrder !== undefined) updateData.position = dto.sortOrder;

    try {
      const updated = await this.spacesRepository.update(
        workspaceId,
        id,
        updateData,
      );
      return SpaceResponseDto.fromEntity(updated);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Space com este nome já existe');
      }
      throw error;
    }
  }

  async remove(
    workspaceId: string,
    id: string,
  ): Promise<{ message: string }> {
    const entity = await this.spacesRepository.findById(workspaceId, id);
    if (!entity) {
      throw new NotFoundException('Space não encontrado');
    }
    if (entity.isProtected) {
      throw new ForbiddenException(
        'Space protegido não pode ser removido',
      );
    }
    await this.spacesRepository.softDelete(workspaceId, id);
    return { message: 'Space deleted successfully' };
  }

  async getSidebarTree(workspaceId: string) {
    const spaces =
      await this.spacesRepository.getSidebarTree(workspaceId);
    return spaces.map((sp) => ({
      id: sp.id,
      name: sp.name,
      slug: sp.slug,
      description: sp.description,
      icon: sp.icon,
      color: sp.color,
      isPrivate: sp.isPrivate,
      isDefault: sp.isDefault,
      isProtected: sp.isProtected,
      sortOrder: sp.position,
      areas: sp.folders,
      directProcesses: sp.lists,
    }));
  }

  async getProcessSummaries(
    workspaceId: string,
    spaceId: string,
    showClosed = false,
  ) {
    const entity = await this.spacesRepository.findById(
      workspaceId,
      spaceId,
    );
    if (!entity) {
      throw new NotFoundException('Space não encontrado');
    }
    return this.spacesRepository.getProcessSummaries(
      workspaceId,
      spaceId,
      showClosed,
    );
  }

  async findBySlug(workspaceId: string, slug: string) {
    const entity = await this.spacesRepository.findBySlugWithDetails(
      workspaceId,
      slug,
    );
    if (!entity) {
      throw new NotFoundException('Space não encontrado');
    }

    return {
      ...SpaceResponseDto.fromEntity(entity),
      areas: entity.folders.map((folder) => ({
        id: folder.id,
        name: folder.name,
        slug: folder.slug,
        description: folder.description,
        isPrivate: folder.isPrivate,
        processCount: folder._count.lists,
      })),
      directProcesses: entity.lists.map((proc) => ({
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
}
