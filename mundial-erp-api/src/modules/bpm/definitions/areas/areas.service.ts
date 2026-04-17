import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { AreasRepository } from './areas.repository';
import { CreateAreaDto } from './dto/create-area.dto';
import { UpdateAreaDto } from './dto/update-area.dto';
import { AreaResponseDto } from './dto/area-response.dto';
import { PaginationDto } from '../../../../common/dtos/pagination.dto';
import { WorkflowStatusesService } from '../workflow-statuses/workflow-statuses.service';

@Injectable()
export class AreasService {
  constructor(
    private readonly areasRepository: AreasRepository,
    @Inject(forwardRef(() => WorkflowStatusesService))
    private readonly workflowStatusesService: WorkflowStatusesService,
  ) {}

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  private async resolveUniqueSlug(baseSlug: string): Promise<string> {
    let slug = baseSlug;
    let suffix = 0;
    while (await this.areasRepository.findBySlug(slug)) {
      suffix++;
      slug = `${baseSlug}-${suffix}`;
    }
    return slug;
  }

  async create(dto: CreateAreaDto): Promise<AreaResponseDto> {
    const baseSlug = this.generateSlug(dto.name);
    const slug = await this.resolveUniqueSlug(baseSlug);

    const useSpaceStatuses = dto.useSpaceStatuses ?? true;

    const entity = await this.areasRepository.create({
      name: dto.name,
      slug,
      description: dto.description,
      isPrivate: dto.isPrivate ?? false,
      icon: dto.icon,
      color: dto.color,
      useSpaceStatuses,
      sortOrder: dto.sortOrder ?? 0,
      department: { connect: { id: dto.departmentId } },
    });

    // Se useSpaceStatuses = false na criação, copia statuses do dept como ponto de partida
    if (!useSpaceStatuses) {
      await this.workflowStatusesService.copyStatusesToArea(
        dto.departmentId,
        entity.id,
      );
    }

    return AreaResponseDto.fromEntity(entity);
  }

  async findAll(pagination: PaginationDto) {
    const { items, total } = await this.areasRepository.findMany({
      skip: pagination.skip,
      take: pagination.limit,
    });
    return {
      items: items.map(AreaResponseDto.fromEntity),
      total,
    };
  }

  async findById(id: string): Promise<AreaResponseDto> {
    const entity = await this.areasRepository.findById(id);
    if (!entity) {
      throw new NotFoundException('Área não encontrada');
    }
    return AreaResponseDto.fromEntity(entity);
  }

  async update(id: string, dto: UpdateAreaDto): Promise<AreaResponseDto> {
    const entity = await this.areasRepository.findById(id);
    if (!entity) {
      throw new NotFoundException('Área não encontrada');
    }

    const updateData: Record<string, any> = {};
    if (dto.name !== undefined) {
      updateData.name = dto.name;
      const baseSlug = this.generateSlug(dto.name);
      const existingSlug = await this.areasRepository.findBySlug(baseSlug);
      if (!existingSlug || existingSlug.id === id) {
        updateData.slug = baseSlug;
      } else {
        updateData.slug = await this.resolveUniqueSlug(baseSlug);
      }
    }
    if (dto.departmentId !== undefined) {
      updateData.department = { connect: { id: dto.departmentId } };
    }
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.isPrivate !== undefined) updateData.isPrivate = dto.isPrivate;
    if (dto.icon !== undefined) updateData.icon = dto.icon;
    if (dto.color !== undefined) updateData.color = dto.color;
    if (dto.useSpaceStatuses !== undefined) updateData.useSpaceStatuses = dto.useSpaceStatuses;
    if (dto.sortOrder !== undefined) updateData.sortOrder = dto.sortOrder;

    const updated = await this.areasRepository.update(id, updateData);

    // Se useSpaceStatuses mudou de true → false, copia statuses do departamento
    if (
      dto.useSpaceStatuses === false &&
      entity.useSpaceStatuses === true
    ) {
      await this.workflowStatusesService.copyStatusesToArea(
        entity.departmentId,
        id,
      );
    }

    return AreaResponseDto.fromEntity(updated);
  }

  async getProcessSummaries(areaId: string, showClosed = false) {
    return this.areasRepository.getProcessSummaries(areaId, showClosed);
  }

  async findBySlug(slug: string) {
    const entity = await this.areasRepository.findBySlugWithDetails(slug);
    if (!entity) {
      throw new NotFoundException('Área não encontrada');
    }

    return {
      ...AreaResponseDto.fromEntity(entity),
      departmentName: entity.department.name,
      departmentSlug: entity.department.slug,
      processes: entity.processes.map((proc) => ({
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

  async remove(id: string): Promise<void> {
    const entity = await this.areasRepository.findById(id);
    if (!entity) {
      throw new NotFoundException('Área não encontrada');
    }
    if (entity.isDefault) {
      throw new BadRequestException('Não é possível excluir uma área padrão');
    }
    await this.areasRepository.softDelete(id);
  }
}
