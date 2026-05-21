import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { CustomFieldGroupsRepository } from './custom-field-groups.repository';
import { CreateCustomFieldGroupDto } from './dtos/create-custom-field-group.dto';
import { UpdateCustomFieldGroupDto } from './dtos/update-custom-field-group.dto';
import { CustomFieldGroupResponseDto } from './dtos/custom-field-group-response.dto';

@Injectable()
export class CustomFieldGroupsService {
  private readonly logger = new Logger(CustomFieldGroupsService.name);

  constructor(private readonly repository: CustomFieldGroupsRepository) {}

  async list(workspaceId: string): Promise<CustomFieldGroupResponseDto[]> {
    const groups = await this.repository.findAll(workspaceId);
    return groups.map(CustomFieldGroupResponseDto.fromEntity);
  }

  async findOne(
    workspaceId: string,
    id: string,
  ): Promise<CustomFieldGroupResponseDto> {
    const group = await this.repository.findOne(workspaceId, id);
    if (!group) {
      throw new NotFoundException('Custom field group nao encontrado');
    }
    return CustomFieldGroupResponseDto.fromEntity(group);
  }

  async listByTaskType(
    workspaceId: string,
    taskTypeId: string,
  ): Promise<CustomFieldGroupResponseDto[]> {
    const groups = await this.repository.findUsedByTaskType(
      workspaceId,
      taskTypeId,
    );
    return groups.map(CustomFieldGroupResponseDto.fromEntity);
  }

  async listByList(
    workspaceId: string,
    listId: string,
  ): Promise<CustomFieldGroupResponseDto[]> {
    const groups = await this.repository.findUsedByList(workspaceId, listId);
    return groups.map(CustomFieldGroupResponseDto.fromEntity);
  }

  async create(
    workspaceId: string,
    dto: CreateCustomFieldGroupDto,
  ): Promise<CustomFieldGroupResponseDto> {
    const entity = await this.repository.create({
      workspaceId,
      name: dto.name,
      color: dto.color ?? null,
      position: dto.position ?? 0,
    });
    this.logger.log(
      `custom-field-group.created id=${entity.id} workspace=${workspaceId}`,
    );
    return CustomFieldGroupResponseDto.fromEntity(entity);
  }

  async update(
    workspaceId: string,
    id: string,
    dto: UpdateCustomFieldGroupDto,
  ): Promise<CustomFieldGroupResponseDto> {
    const existing = await this.repository.findOne(workspaceId, id);
    if (!existing) {
      throw new NotFoundException('Custom field group nao encontrado');
    }
    const updated = await this.repository.update(id, {
      name: dto.name,
      color: dto.color === undefined ? undefined : (dto.color ?? null),
      position: dto.position,
    });
    this.logger.log(
      `custom-field-group.updated id=${id} workspace=${workspaceId}`,
    );
    return CustomFieldGroupResponseDto.fromEntity(updated);
  }

  async remove(
    workspaceId: string,
    id: string,
  ): Promise<CustomFieldGroupResponseDto> {
    const existing = await this.repository.findOne(workspaceId, id);
    if (!existing) {
      throw new NotFoundException('Custom field group nao encontrado');
    }
    const deleted = await this.repository.delete(id);
    this.logger.log(
      `custom-field-group.deleted id=${id} workspace=${workspaceId}`,
    );
    return CustomFieldGroupResponseDto.fromEntity(deleted);
  }
}
