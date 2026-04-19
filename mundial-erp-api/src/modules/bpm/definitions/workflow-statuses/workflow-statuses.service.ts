import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { StatusCategory } from '@prisma/client';
import { WorkflowStatusesRepository } from './workflow-statuses.repository';
import { CreateWorkflowStatusDto } from './dto/create-workflow-status.dto';
import { UpdateWorkflowStatusDto } from './dto/update-workflow-status.dto';
import { WorkflowStatusResponseDto } from './dto/workflow-status-response.dto';
import { ReorderWorkflowStatusesDto } from './dto/reorder-workflow-statuses.dto';

@Injectable()
export class WorkflowStatusesService {
  constructor(
    private readonly workflowStatusesRepository: WorkflowStatusesRepository,
  ) {}

  async create(
    workspaceId: string,
    dto: CreateWorkflowStatusDto,
  ): Promise<WorkflowStatusResponseDto> {
    const maxSortOrder = await this.workflowStatusesRepository.getMaxSortOrder(
      workspaceId,
      dto.departmentId,
    );

    const entity = await this.workflowStatusesRepository.create(workspaceId, {
      name: dto.name,
      category: dto.category,
      color: dto.color,
      icon: dto.icon ?? null,
      sortOrder: maxSortOrder + 1,
      department: { connect: { id: dto.departmentId } },
    });

    const full = await this.workflowStatusesRepository.findById(
      workspaceId,
      entity.id,
    );
    return WorkflowStatusResponseDto.fromEntity(full!);
  }

  async findByDepartment(
    workspaceId: string,
    departmentId: string,
    areaId?: string,
  ): Promise<Record<StatusCategory, WorkflowStatusResponseDto[]>> {
    let statuses;

    if (areaId) {
      const area = await this.workflowStatusesRepository.findAreaById(
        workspaceId,
        areaId,
      );
      if (area && !area.useSpaceStatuses) {
        statuses = await this.workflowStatusesRepository.findByArea(
          workspaceId,
          areaId,
        );
      } else {
        statuses = await this.workflowStatusesRepository.findByDepartment(
          workspaceId,
          departmentId,
        );
      }
    } else {
      statuses = await this.workflowStatusesRepository.findByDepartment(
        workspaceId,
        departmentId,
      );
    }

    const grouped: Record<StatusCategory, WorkflowStatusResponseDto[]> = {
      NOT_STARTED: [],
      ACTIVE: [],
      DONE: [],
      CLOSED: [],
    };

    for (const status of statuses) {
      grouped[status.category].push(
        WorkflowStatusResponseDto.fromEntity(status),
      );
    }

    return grouped;
  }

  async copyStatusesToArea(
    workspaceId: string,
    departmentId: string,
    areaId: string,
  ) {
    return this.workflowStatusesRepository.copyDepartmentStatusesToArea(
      workspaceId,
      departmentId,
      areaId,
    );
  }

  async update(
    workspaceId: string,
    id: string,
    dto: UpdateWorkflowStatusDto,
  ): Promise<WorkflowStatusResponseDto> {
    const entity = await this.workflowStatusesRepository.findById(
      workspaceId,
      id,
    );
    if (!entity) {
      throw new NotFoundException('Status não encontrado');
    }

    const updateData: Record<string, any> = {};
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.color !== undefined) updateData.color = dto.color;
    if (dto.icon !== undefined) updateData.icon = dto.icon;

    const updated = await this.workflowStatusesRepository.update(
      workspaceId,
      id,
      updateData,
    );
    return WorkflowStatusResponseDto.fromEntity(updated);
  }

  async remove(
    workspaceId: string,
    id: string,
    migrateToStatusId?: string,
  ): Promise<void> {
    const entity = await this.workflowStatusesRepository.findById(
      workspaceId,
      id,
    );
    if (!entity) {
      throw new NotFoundException('Status não encontrado');
    }

    const categoryCount =
      await this.workflowStatusesRepository.countByCategoryAndDepartment(
        workspaceId,
        entity.category,
        entity.departmentId,
      );
    if (categoryCount <= 1) {
      throw new ConflictException(
        'Não é possível remover o último status de uma categoria',
      );
    }

    const workItemCount =
      await this.workflowStatusesRepository.countWorkItemsByStatusId(
        workspaceId,
        id,
      );
    if (workItemCount > 0) {
      if (!migrateToStatusId) {
        throw new BadRequestException(
          'Este status possui work items vinculados. Informe migrateToStatusId para migrar os itens.',
        );
      }

      const targetStatus = await this.workflowStatusesRepository.findById(
        workspaceId,
        migrateToStatusId,
      );
      if (!targetStatus) {
        throw new NotFoundException('Status de destino não encontrado');
      }
      if (targetStatus.departmentId !== entity.departmentId) {
        throw new BadRequestException(
          'O status de destino deve pertencer ao mesmo departamento',
        );
      }

      await this.workflowStatusesRepository.migrateWorkItems(
        workspaceId,
        id,
        migrateToStatusId,
      );
    }

    await this.workflowStatusesRepository.softDelete(workspaceId, id);
  }

  async reorder(
    workspaceId: string,
    dto: ReorderWorkflowStatusesDto,
  ): Promise<void> {
    // Validar ownership de todos os ids
    for (const item of dto.items) {
      const entity = await this.workflowStatusesRepository.findById(
        workspaceId,
        item.id,
      );
      if (!entity) {
        throw new NotFoundException(`Status ${item.id} não encontrado`);
      }
    }
    await this.workflowStatusesRepository.updateManySortOrder(
      workspaceId,
      dto.items,
    );
  }
}
