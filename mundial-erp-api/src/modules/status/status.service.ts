import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { StatusRepository } from './status.repository';
import { CreateStatusDto } from './dto/create-status.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import {
  StatusDetailResponseDto,
  StatusResponseDto,
} from './dto/status-response.dto';
import { StatusRequiredFieldResponseDto } from './dto/status-required-field-response.dto';

@Injectable()
export class StatusService {
  constructor(private readonly statusRepository: StatusRepository) {}

  async create(
    workspaceId: string,
    dto: CreateStatusDto,
  ): Promise<StatusResponseDto> {
    const entity = await this.statusRepository.create(workspaceId, dto);
    return StatusResponseDto.fromEntity(entity);
  }

  async findByList(
    workspaceId: string,
    listId: string,
  ): Promise<StatusResponseDto[]> {
    const list = await this.statusRepository.findListById(workspaceId, listId);
    if (!list) {
      throw new NotFoundException(`List with ID ${listId} not found`);
    }
    const statuses = await this.statusRepository.findByList(
      workspaceId,
      listId,
    );
    return statuses.map((s) => StatusResponseDto.fromEntity(s));
  }

  async findById(
    workspaceId: string,
    id: string,
  ): Promise<StatusDetailResponseDto> {
    const entity = await this.statusRepository.findByIdWithTasks(
      workspaceId,
      id,
    );
    if (!entity) {
      throw new NotFoundException(`Status with ID ${id} not found`);
    }
    return StatusDetailResponseDto.fromEntityWithTasks(
      entity as Parameters<typeof StatusDetailResponseDto.fromEntityWithTasks>[0],
    );
  }

  async update(
    workspaceId: string,
    id: string,
    dto: UpdateStatusDto,
  ): Promise<StatusResponseDto> {
    if (dto.id !== id) {
      throw new BadRequestException('id no body deve coincidir com id da URL');
    }
    const entity = await this.statusRepository.findById(workspaceId, id);
    if (!entity) {
      throw new NotFoundException(`Status with ID ${id} not found`);
    }

    const patch: Record<string, unknown> = {};
    if (dto.type !== undefined) patch.type = dto.type;
    if (dto.name !== undefined) patch.name = dto.name;
    if (dto.color !== undefined) patch.color = dto.color;
    if (dto.position !== undefined) patch.position = dto.position;

    const updated = await this.statusRepository.update(workspaceId, id, patch);
    return StatusResponseDto.fromEntity(updated);
  }

  async remove(
    workspaceId: string,
    id: string,
  ): Promise<StatusResponseDto> {
    const entity = await this.statusRepository.findById(workspaceId, id);
    if (!entity) {
      throw new NotFoundException(`Status with ID ${id} not found`);
    }
    const deleted = await this.statusRepository.softDelete(workspaceId, id);
    return StatusResponseDto.fromEntity(deleted);
  }

  async findRequiredFields(
    workspaceId: string,
    statusId: string,
  ): Promise<StatusRequiredFieldResponseDto[]> {
    const status = await this.statusRepository.findById(workspaceId, statusId);
    if (!status) {
      throw new NotFoundException(`Status with ID ${statusId} not found`);
    }
    const rows = await this.statusRepository.findRequiredFieldsByStatusId(
      workspaceId,
      statusId,
    );
    return rows.map((row) => StatusRequiredFieldResponseDto.fromEntity(row));
  }

  async setRequiredFields(
    workspaceId: string,
    statusId: string,
    customFieldIds: string[],
  ): Promise<StatusRequiredFieldResponseDto[]> {
    const status = await this.statusRepository.findById(workspaceId, statusId);
    if (!status) {
      throw new NotFoundException(`Status with ID ${statusId} not found`);
    }
    const rows = await this.statusRepository.replaceRequiredFields(
      workspaceId,
      statusId,
      customFieldIds,
    );
    return rows.map((row) => StatusRequiredFieldResponseDto.fromEntity(row));
  }

  async copyStatusesToFolder(
    workspaceId: string,
    spaceId: string,
    folderId: string,
  ) {
    return this.statusRepository.copySpaceStatusesToFolder(
      workspaceId,
      spaceId,
      folderId,
    );
  }
}
