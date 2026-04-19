import { Injectable, NotFoundException } from '@nestjs/common';
import { ProcessViewsRepository } from './process-views.repository';
import { CreateProcessViewDto } from './dto/create-process-view.dto';
import { UpdateProcessViewDto } from './dto/update-process-view.dto';
import { ProcessViewResponseDto } from './dto/process-view-response.dto';
import { PaginationDto } from '../../common/dtos/pagination.dto';

@Injectable()
export class ProcessViewsService {
  constructor(
    private readonly processViewsRepository: ProcessViewsRepository,
  ) {}

  async create(
    workspaceId: string,
    dto: CreateProcessViewDto,
  ): Promise<ProcessViewResponseDto> {
    const proc = await this.processViewsRepository.findProcessById(
      workspaceId,
      dto.processId,
    );
    if (!proc) {
      throw new NotFoundException('Processo não encontrado');
    }
    const entity = await this.processViewsRepository.create(workspaceId, {
      processId: dto.processId,
      name: dto.name,
      viewType: dto.viewType,
      config: dto.config ?? {},
    });

    return ProcessViewResponseDto.fromEntity(entity);
  }

  async findAllByProcess(
    workspaceId: string,
    processId: string,
    pagination: PaginationDto,
  ) {
    const proc = await this.processViewsRepository.findProcessById(
      workspaceId,
      processId,
    );
    if (!proc) {
      throw new NotFoundException('Processo não encontrado');
    }
    const { items, total } =
      await this.processViewsRepository.findManyByProcess(workspaceId, {
        processId,
        skip: pagination.skip,
        take: pagination.limit,
      });
    return {
      items: items.map(ProcessViewResponseDto.fromEntity),
      total,
    };
  }

  async update(
    workspaceId: string,
    id: string,
    dto: UpdateProcessViewDto,
  ): Promise<ProcessViewResponseDto> {
    const entity = await this.processViewsRepository.findById(workspaceId, id);
    if (!entity) {
      throw new NotFoundException('Visão não encontrada');
    }

    const updateData: Record<string, any> = {};
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.config !== undefined) updateData.config = dto.config;

    const updated = await this.processViewsRepository.update(
      workspaceId,
      id,
      updateData,
    );
    return ProcessViewResponseDto.fromEntity(updated);
  }

  async pin(workspaceId: string, id: string): Promise<ProcessViewResponseDto> {
    const entity = await this.processViewsRepository.findById(workspaceId, id);
    if (!entity) {
      throw new NotFoundException('Visão não encontrada');
    }

    await this.processViewsRepository.unpinAllByProcess(
      workspaceId,
      entity.processId,
    );
    const updated = await this.processViewsRepository.update(workspaceId, id, {
      isPinned: true,
    });
    return ProcessViewResponseDto.fromEntity(updated);
  }

  async remove(workspaceId: string, id: string): Promise<void> {
    const entity = await this.processViewsRepository.findById(workspaceId, id);
    if (!entity) {
      throw new NotFoundException('Visão não encontrada');
    }
    await this.processViewsRepository.softDelete(workspaceId, id);
  }
}
