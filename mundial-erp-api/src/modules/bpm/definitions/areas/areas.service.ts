import {
  BadRequestException,
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
import { DepartmentsRepository } from '../departments/departments.repository';

@Injectable()
export class AreasService {
  constructor(
    private readonly areasRepository: AreasRepository,
    private readonly departmentsRepository: DepartmentsRepository,
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

  private async resolveUniqueSlug(
    workspaceId: string,
    baseSlug: string,
  ): Promise<string> {
    let slug = baseSlug;
    let suffix = 0;
    while (await this.areasRepository.findBySlug(workspaceId, slug)) {
      suffix++;
      slug = `${baseSlug}-${suffix}`;
    }
    return slug;
  }

  private async assertDepartmentInWorkspace(
    workspaceId: string,
    departmentId: string,
  ) {
    const dept = await this.departmentsRepository.findById(
      workspaceId,
      departmentId,
    );
    if (!dept) {
      throw new NotFoundException('Departamento não encontrado');
    }
  }

  async create(
    workspaceId: string,
    dto: CreateAreaDto,
  ): Promise<AreaResponseDto> {
    await this.assertDepartmentInWorkspace(workspaceId, dto.departmentId);

    const baseSlug = this.generateSlug(dto.name);
    const slug = await this.resolveUniqueSlug(workspaceId, baseSlug);

    const useSpaceStatuses = dto.useSpaceStatuses ?? true;

    const entity = await this.areasRepository.create(workspaceId, {
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

    if (!useSpaceStatuses) {
      await this.workflowStatusesService.copyStatusesToArea(
        workspaceId,
        dto.departmentId,
        entity.id,
      );
    }

    return AreaResponseDto.fromEntity(entity);
  }

  async findAll(workspaceId: string, pagination: PaginationDto) {
    const { items, total } = await this.areasRepository.findMany(workspaceId, {
      skip: pagination.skip,
      take: pagination.limit,
    });
    return {
      items: items.map(AreaResponseDto.fromEntity),
      total,
    };
  }

  async findById(workspaceId: string, id: string): Promise<AreaResponseDto> {
    const entity = await this.areasRepository.findById(workspaceId, id);
    if (!entity) {
      throw new NotFoundException('Área não encontrada');
    }
    return AreaResponseDto.fromEntity(entity);
  }

  async update(
    workspaceId: string,
    id: string,
    dto: UpdateAreaDto,
  ): Promise<AreaResponseDto> {
    const entity = await this.areasRepository.findById(workspaceId, id);
    if (!entity) {
      throw new NotFoundException('Área não encontrada');
    }

    const updateData: Record<string, any> = {};
    if (dto.name !== undefined) {
      updateData.name = dto.name;
      const baseSlug = this.generateSlug(dto.name);
      const existingSlug = await this.areasRepository.findBySlug(
        workspaceId,
        baseSlug,
      );
      if (!existingSlug || existingSlug.id === id) {
        updateData.slug = baseSlug;
      } else {
        updateData.slug = await this.resolveUniqueSlug(workspaceId, baseSlug);
      }
    }
    if (dto.departmentId !== undefined) {
      await this.assertDepartmentInWorkspace(workspaceId, dto.departmentId);
      updateData.department = { connect: { id: dto.departmentId } };
    }
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.isPrivate !== undefined) updateData.isPrivate = dto.isPrivate;
    if (dto.icon !== undefined) updateData.icon = dto.icon;
    if (dto.color !== undefined) updateData.color = dto.color;
    if (dto.useSpaceStatuses !== undefined)
      updateData.useSpaceStatuses = dto.useSpaceStatuses;
    if (dto.sortOrder !== undefined) updateData.sortOrder = dto.sortOrder;

    const updated = await this.areasRepository.update(
      workspaceId,
      id,
      updateData,
    );

    if (dto.useSpaceStatuses === false && entity.useSpaceStatuses === true) {
      await this.workflowStatusesService.copyStatusesToArea(
        workspaceId,
        entity.departmentId,
        id,
      );
    }

    return AreaResponseDto.fromEntity(updated);
  }

  async getProcessSummaries(
    workspaceId: string,
    areaId: string,
    showClosed = false,
  ) {
    return this.areasRepository.getProcessSummaries(
      workspaceId,
      areaId,
      showClosed,
    );
  }

  async findBySlug(workspaceId: string, slug: string) {
    const entity = await this.areasRepository.findBySlugWithDetails(
      workspaceId,
      slug,
    );
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

  async remove(workspaceId: string, id: string): Promise<void> {
    const entity = await this.areasRepository.findById(workspaceId, id);
    if (!entity) {
      throw new NotFoundException('Área não encontrada');
    }
    if (entity.isDefault) {
      throw new BadRequestException('Não é possível excluir uma área padrão');
    }
    await this.areasRepository.softDelete(workspaceId, id);
  }
}
