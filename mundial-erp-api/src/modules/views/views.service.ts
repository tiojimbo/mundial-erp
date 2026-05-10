import { Injectable, NotFoundException } from '@nestjs/common';
import { ViewsRepository } from './views.repository';
import { CreateViewDto } from './dto/create-view.dto';
import { UpdateViewDto } from './dto/update-view.dto';
import { ViewResponseDto } from './dto/view-response.dto';
import { PaginationDto } from '../../common/dtos/pagination.dto';

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
      throw new NotFoundException('Processo não encontrado');
    }
    const entity = await this.viewsRepository.create(workspaceId, {
      listId: dto.listId,
      name: dto.name,
      viewType: dto.viewType,
      config: dto.config ?? {},
    });

    return ViewResponseDto.fromEntity(entity);
  }

  async findAllByList(
    workspaceId: string,
    listId: string,
    pagination: PaginationDto,
  ) {
    const list = await this.viewsRepository.findListById(
      workspaceId,
      listId,
    );
    if (!list) {
      throw new NotFoundException('Processo não encontrado');
    }
    const { items, total } = await this.viewsRepository.findManyByList(
      workspaceId,
      {
        listId,
        skip: pagination.skip,
        take: pagination.limit,
      },
    );
    return {
      items: items.map(ViewResponseDto.fromEntity),
      total,
    };
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
