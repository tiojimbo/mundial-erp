import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ListsRepository } from './lists.repository';
import { CreateListDto } from './dto/create-list.dto';
import { UpdateListDto } from './dto/update-list.dto';
import { ListResponseDto } from './dto/list-response.dto';
import { PrismaService } from '../../../../database/prisma.service';
import { SpacesRepository } from '../spaces/spaces.repository';

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
    if (!dto.folderId && !dto.spaceId && !dto.sectorId) {
      throw new BadRequestException(
        'Deve informar folderId, spaceId ou sectorId',
      );
    }

    const baseSlug = this.generateSlug(dto.name);
    const slug = await this.resolveUniqueSlug(workspaceId, baseSlug);

    let resolvedSpaceId = dto.spaceId;
    if (dto.folderId) {
      const folder = await this.listsRepository.findFolderById(
        workspaceId,
        dto.folderId,
      );
      if (!folder) {
        throw new NotFoundException('Folder não encontrado');
      }
      resolvedSpaceId = folder.spaceId;
    }

    if (resolvedSpaceId) {
      const space = await this.spacesRepository.findById(
        workspaceId,
        resolvedSpaceId,
      );
      if (!space) {
        throw new NotFoundException('Space não encontrado');
      }
    }

    const createData: Prisma.ListCreateInput = {
      name: dto.name,
      slug,
      description: dto.description,
      isPrivate: dto.isPrivate ?? false,
      processType: dto.processType ?? 'LIST',
      status: dto.status,
      position: dto.sortOrder ?? 0,
      creator: { connect: { id: creatorId } },
      ...(dto.sectorId && { sector: { connect: { id: dto.sectorId } } }),
      ...(dto.folderId && { folder: { connect: { id: dto.folderId } } }),
      ...(resolvedSpaceId && {
        space: { connect: { id: resolvedSpaceId } },
      }),
    };

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
    if (dto.sectorId !== undefined) {
      updateData.sector = { connect: { id: dto.sectorId } };
    }
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.isPrivate !== undefined) updateData.isPrivate = dto.isPrivate;
    if (dto.status !== undefined) updateData.status = dto.status;
    if (dto.sortOrder !== undefined) updateData.position = dto.sortOrder;

    const updated = await this.listsRepository.update(
      workspaceId,
      id,
      updateData,
    );
    return ListResponseDto.fromEntity(updated);
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
}
