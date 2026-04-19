import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ActivitiesRepository } from './activities.repository';
import { CreateActivityDto } from './dto/create-activity.dto';
import { UpdateActivityDto } from './dto/update-activity.dto';
import { ActivityResponseDto } from './dto/activity-response.dto';
import { PaginationDto } from '../../../../common/dtos/pagination.dto';

@Injectable()
export class ActivitiesService {
  constructor(private readonly activitiesRepository: ActivitiesRepository) {}

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  async create(dto: CreateActivityDto): Promise<ActivityResponseDto> {
    const slug = this.generateSlug(dto.name);

    const existing = await this.activitiesRepository.findBySlug(slug);
    if (existing) {
      throw new ConflictException('Atividade com este nome já existe');
    }

    const entity = await this.activitiesRepository.create({
      name: dto.name,
      slug,
      process: { connect: { id: dto.processId } },
      ownerRole: dto.ownerRole,
      inputDescription: dto.inputDescription,
      outputDescription: dto.outputDescription,
      slaMinutes: dto.slaMinutes,
      exceptions: dto.exceptions,
      sortOrder: dto.sortOrder ?? 0,
      isAutomatic: dto.isAutomatic ?? false,
      triggerOnStatus: dto.triggerOnStatus,
    });

    return ActivityResponseDto.fromEntity(entity);
  }

  async findAll(pagination: PaginationDto) {
    const { items, total } = await this.activitiesRepository.findMany({
      skip: pagination.skip,
      take: pagination.limit,
    });
    return {
      items: items.map(ActivityResponseDto.fromEntity),
      total,
    };
  }

  async findById(id: string): Promise<ActivityResponseDto> {
    const entity = await this.activitiesRepository.findById(id);
    if (!entity) {
      throw new NotFoundException('Atividade não encontrada');
    }
    return ActivityResponseDto.fromEntity(entity);
  }

  async update(
    id: string,
    dto: UpdateActivityDto,
  ): Promise<ActivityResponseDto> {
    const entity = await this.activitiesRepository.findById(id);
    if (!entity) {
      throw new NotFoundException('Atividade não encontrada');
    }

    const updateData: Record<string, any> = {};
    if (dto.name !== undefined) {
      updateData.name = dto.name;
      updateData.slug = this.generateSlug(dto.name);
      const existingSlug = await this.activitiesRepository.findBySlug(
        updateData.slug,
      );
      if (existingSlug && existingSlug.id !== id) {
        throw new ConflictException('Atividade com este nome já existe');
      }
    }
    if (dto.processId !== undefined) {
      updateData.process = { connect: { id: dto.processId } };
    }
    if (dto.ownerRole !== undefined) updateData.ownerRole = dto.ownerRole;
    if (dto.inputDescription !== undefined)
      updateData.inputDescription = dto.inputDescription;
    if (dto.outputDescription !== undefined)
      updateData.outputDescription = dto.outputDescription;
    if (dto.slaMinutes !== undefined) updateData.slaMinutes = dto.slaMinutes;
    if (dto.exceptions !== undefined) updateData.exceptions = dto.exceptions;
    if (dto.sortOrder !== undefined) updateData.sortOrder = dto.sortOrder;
    if (dto.isAutomatic !== undefined) updateData.isAutomatic = dto.isAutomatic;
    if (dto.triggerOnStatus !== undefined)
      updateData.triggerOnStatus = dto.triggerOnStatus;

    const updated = await this.activitiesRepository.update(id, updateData);
    return ActivityResponseDto.fromEntity(updated);
  }

  async remove(id: string): Promise<void> {
    const entity = await this.activitiesRepository.findById(id);
    if (!entity) {
      throw new NotFoundException('Atividade não encontrada');
    }
    await this.activitiesRepository.softDelete(id);
  }
}
