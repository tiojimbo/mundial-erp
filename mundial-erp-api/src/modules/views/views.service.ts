import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ViewsRepository } from './views.repository';
import { CreateViewDto } from './dto/create-view.dto';
import { UpdateViewDto } from './dto/update-view.dto';
import { ViewResponseDto } from './dto/view-response.dto';
import { ListViewsQueryDto } from './dto/list-views-query.dto';

@Injectable()
export class ViewsService {
  constructor(private readonly viewsRepository: ViewsRepository) {}

  async create(
    workspaceId: string,
    dto: CreateViewDto,
  ): Promise<ViewResponseDto> {
    const list = await this.viewsRepository.findListById(
      workspaceId,
      dto.listId,
    );
    if (!list) {
      throw new NotFoundException('Lista não encontrada');
    }
    const entity = await this.viewsRepository.create(workspaceId, {
      listId: dto.listId,
      name: dto.name,
      viewType: dto.viewType,
      config: dto.config ?? {},
    });

    return ViewResponseDto.fromEntity(entity);
  }

  async findManyByScope(workspaceId: string, query: ListViewsQueryDto) {
    const filters = [query.listId, query.folderId, query.spaceId].filter(
      Boolean,
    );
    if (filters.length === 0) {
      throw new BadRequestException(
        'Informe ao menos um filtro: listId, folderId ou spaceId',
      );
    }
    if (filters.length > 1) {
      throw new BadRequestException(
        'Use apenas um filtro: listId, folderId ou spaceId',
      );
    }
    const { items, total } = await this.viewsRepository.findManyByScope(
      workspaceId,
      {
        listId: query.listId,
        folderId: query.folderId,
        spaceId: query.spaceId,
        skip: query.skip,
        take: query.limit,
      },
    );
    return {
      items: items.map(ViewResponseDto.fromEntity),
      total,
    };
  }

  async findOne(workspaceId: string, id: string): Promise<ViewResponseDto> {
    const entity = await this.viewsRepository.findById(workspaceId, id);
    if (!entity) {
      throw new NotFoundException('Visão não encontrada');
    }
    return ViewResponseDto.fromEntity(entity);
  }

  async update(
    workspaceId: string,
    id: string,
    dto: UpdateViewDto,
  ): Promise<ViewResponseDto> {
    const entity = await this.viewsRepository.findById(workspaceId, id);
    if (!entity) {
      throw new NotFoundException('Visão não encontrada');
    }

    const updateData: Record<string, any> = {};
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.config !== undefined) updateData.config = dto.config;

    const updated = await this.viewsRepository.update(
      workspaceId,
      id,
      updateData,
    );
    return ViewResponseDto.fromEntity(updated);
  }

  async pin(workspaceId: string, id: string): Promise<ViewResponseDto> {
    const entity = await this.viewsRepository.findById(workspaceId, id);
    if (!entity) {
      throw new NotFoundException('Visão não encontrada');
    }

    await this.viewsRepository.unpinAllByList(workspaceId, entity.listId);
    const updated = await this.viewsRepository.update(workspaceId, id, {
      isPinned: true,
    });
    return ViewResponseDto.fromEntity(updated);
  }

  async remove(workspaceId: string, id: string): Promise<void> {
    const entity = await this.viewsRepository.findById(workspaceId, id);
    if (!entity) {
      throw new NotFoundException('Visão não encontrada');
    }
    await this.viewsRepository.softDelete(workspaceId, id);
  }
}
