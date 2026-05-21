import { Injectable, NotFoundException } from '@nestjs/common';
import { StatusTemplatesRepository } from './status-templates.repository';
import { CreateStatusTemplateDto } from './dto/create-status-template.dto';
import { StatusTemplateResponseDto } from './dto/status-template-response.dto';

@Injectable()
export class StatusTemplatesService {
  constructor(private readonly repository: StatusTemplatesRepository) {}

  async findAll(workspaceId: string): Promise<StatusTemplateResponseDto[]> {
    const entities = await this.repository.findAll(workspaceId);
    return entities.map((entity) => StatusTemplateResponseDto.fromEntity(entity));
  }

  async create(
    workspaceId: string,
    dto: CreateStatusTemplateDto,
  ): Promise<StatusTemplateResponseDto> {
    const items = dto.statuses.map((status, index) => ({
      name: status.name,
      type: status.type,
      color: status.color,
      position: status.position ?? index + 1,
    }));
    const entity = await this.repository.create(workspaceId, {
      name: dto.name,
      items,
    });
    return StatusTemplateResponseDto.fromEntity(entity);
  }

  async remove(
    workspaceId: string,
    id: string,
  ): Promise<StatusTemplateResponseDto> {
    const existing = await this.repository.findById(workspaceId, id);
    if (!existing) {
      throw new NotFoundException(`Status template with ID ${id} not found`);
    }
    const removed = await this.repository.remove(workspaceId, id);
    return StatusTemplateResponseDto.fromEntity(removed);
  }
}
