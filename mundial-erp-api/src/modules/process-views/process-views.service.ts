import { Injectable, NotFoundException } from '@nestjs/common';
import { ProcessViewsRepository } from './process-views.repository';
import { CreateProcessViewDto } from './dto/create-process-view.dto';
import { UpdateProcessViewDto } from './dto/update-process-view.dto';
import { ProcessViewResponseDto } from './dto/process-view-response.dto';
import { PaginationDto } from '../../common/dtos/pagination.dto';

@Injectable()
export class ProcessViewsService {
  constructor(private readonly processViewsRepository: ProcessViewsRepository) {}

  async create(dto: CreateProcessViewDto): Promise<ProcessViewResponseDto> {
    const entity = await this.processViewsRepository.create({
      processId: dto.processId,
      name: dto.name,
      viewType: dto.viewType,
      config: dto.config ?? {},
    });

    return ProcessViewResponseDto.fromEntity(entity);
  }

  async findAllByProcess(processId: string, pagination: PaginationDto) {
    const { items, total } = await this.processViewsRepository.findManyByProcess({
      processId,
      skip: pagination.skip,
      take: pagination.limit,
    });
    return {
      items: items.map(ProcessViewResponseDto.fromEntity),
      total,
    };
  }

  async update(id: string, dto: UpdateProcessViewDto): Promise<ProcessViewResponseDto> {
    const entity = await this.processViewsRepository.findById(id);
    if (!entity) {
      throw new NotFoundException('Visão não encontrada');
    }

    const updateData: Record<string, any> = {};
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.config !== undefined) updateData.config = dto.config;

    const updated = await this.processViewsRepository.update(id, updateData);
    return ProcessViewResponseDto.fromEntity(updated);
  }

  async pin(id: string): Promise<ProcessViewResponseDto> {
    const entity = await this.processViewsRepository.findById(id);
    if (!entity) {
      throw new NotFoundException('Visão não encontrada');
    }

    await this.processViewsRepository.unpinAllByProcess(entity.processId);
    const updated = await this.processViewsRepository.update(id, { isPinned: true });
    return ProcessViewResponseDto.fromEntity(updated);
  }

  async remove(id: string): Promise<void> {
    const entity = await this.processViewsRepository.findById(id);
    if (!entity) {
      throw new NotFoundException('Visão não encontrada');
    }
    await this.processViewsRepository.softDelete(id);
  }
}
