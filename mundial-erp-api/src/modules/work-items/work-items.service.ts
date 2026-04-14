import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { WorkItemsRepository } from './work-items.repository';
import { CreateWorkItemDto } from './dto/create-work-item.dto';
import { UpdateWorkItemDto } from './dto/update-work-item.dto';
import { ChangeStatusDto } from './dto/change-status.dto';
import { ReorderWorkItemsDto } from './dto/reorder-work-items.dto';
import { WorkItemResponseDto } from './dto/work-item-response.dto';
import { WorkItemFiltersDto } from './dto/work-item-filters.dto';

@Injectable()
export class WorkItemsService {
  constructor(private readonly workItemsRepository: WorkItemsRepository) {}

  async create(
    dto: CreateWorkItemDto,
    creatorId: string,
  ): Promise<WorkItemResponseDto> {
    const process = await this.workItemsRepository.findProcessById(
      dto.processId,
    );
    if (!process) {
      throw new NotFoundException('Processo não encontrado');
    }

    const status = await this.workItemsRepository.findStatusById(dto.statusId);
    if (!status) {
      throw new NotFoundException('Status não encontrado');
    }

    if (process.departmentId && status.departmentId !== process.departmentId) {
      throw new BadRequestException(
        'Status não pertence ao departamento do processo',
      );
    }

    const entity = await this.workItemsRepository.create({
      processId: dto.processId,
      title: dto.title,
      description: dto.description,
      statusId: dto.statusId,
      itemType: dto.itemType,
      priority: dto.priority,
      assigneeId: dto.assigneeId,
      creatorId,
      parentId: dto.parentId,
      startDate: dto.startDate ? new Date(dto.startDate) : undefined,
      dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
      estimatedMinutes: dto.estimatedMinutes,
    });

    return WorkItemResponseDto.fromEntity(entity);
  }

  async findAll(filters: WorkItemFiltersDto) {
    const { items, total } = await this.workItemsRepository.findMany({
      skip: filters.skip,
      take: filters.limit,
      processId: filters.processId,
      statusId: filters.statusId,
      assigneeId: filters.assigneeId,
      priority: filters.priority,
      itemType: filters.itemType,
      search: filters.search,
      showClosed: filters.showClosed,
      showSubtasks: filters.showSubtasks,
    });

    return {
      items: items.map(WorkItemResponseDto.fromEntity),
      total,
    };
  }

  async findGrouped(processId: string, showClosed = false) {
    const process =
      await this.workItemsRepository.findProcessById(processId);
    if (!process) {
      throw new NotFoundException('Processo não encontrado');
    }

    const { items, statuses } =
      await this.workItemsRepository.findGroupedByStatus(
        processId,
        showClosed,
      );

    const groupMap = new Map<
      string,
      {
        statusId: string;
        statusName: string;
        statusColor: string;
        statusIcon: string | null;
        category: string;
        count: number;
        items: WorkItemResponseDto[];
      }
    >();

    // Initialize groups from all statuses (so empty statuses appear too)
    for (const status of statuses) {
      groupMap.set(status.id, {
        statusId: status.id,
        statusName: status.name,
        statusColor: status.color,
        statusIcon: status.icon,
        category: status.category,
        count: 0,
        items: [],
      });
    }

    // Populate groups with items
    for (const item of items) {
      let group = groupMap.get(item.statusId);
      if (!group) {
        // Status exists but wasn't in the department statuses (edge case)
        group = {
          statusId: item.statusId,
          statusName: item.status?.name ?? 'Desconhecido',
          statusColor: item.status?.color ?? '#gray',
          statusIcon: item.status?.icon ?? null,
          category: item.status?.category ?? 'NOT_STARTED',
          count: 0,
          items: [],
        };
        groupMap.set(item.statusId, group);
      }
      group.items.push(WorkItemResponseDto.fromEntity(item));
      group.count++;
    }

    const groups = Array.from(groupMap.values());

    return {
      groups,
      total: items.length,
    };
  }

  async findById(id: string): Promise<WorkItemResponseDto> {
    const entity = await this.workItemsRepository.findById(id);
    if (!entity) {
      throw new NotFoundException('Work item não encontrado');
    }
    return WorkItemResponseDto.fromEntity(entity);
  }

  async update(
    id: string,
    dto: UpdateWorkItemDto,
  ): Promise<WorkItemResponseDto> {
    const entity = await this.workItemsRepository.findById(id);
    if (!entity) {
      throw new NotFoundException('Work item não encontrado');
    }

    const updateData: Record<string, any> = {};

    if (dto.title !== undefined) updateData.title = dto.title;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.itemType !== undefined) updateData.itemType = dto.itemType;
    if (dto.priority !== undefined) updateData.priority = dto.priority;
    if (dto.assigneeId !== undefined) updateData.assigneeId = dto.assigneeId;
    if (dto.parentId !== undefined) updateData.parentId = dto.parentId;
    if (dto.startDate !== undefined)
      updateData.startDate = dto.startDate ? new Date(dto.startDate) : null;
    if (dto.dueDate !== undefined)
      updateData.dueDate = dto.dueDate ? new Date(dto.dueDate) : null;
    if (dto.estimatedMinutes !== undefined)
      updateData.estimatedMinutes = dto.estimatedMinutes;

    if (dto.statusId !== undefined && dto.statusId !== entity.statusId) {
      await this.validateStatusForProcess(dto.statusId, entity.processId);
      updateData.statusId = dto.statusId;
    }

    if (dto.processId !== undefined && dto.processId !== entity.processId) {
      const process = await this.workItemsRepository.findProcessById(
        dto.processId,
      );
      if (!process) {
        throw new NotFoundException('Processo não encontrado');
      }
      updateData.processId = dto.processId;
    }

    const updated = await this.workItemsRepository.update(id, updateData);
    return WorkItemResponseDto.fromEntity(updated);
  }

  async changeStatus(
    id: string,
    dto: ChangeStatusDto,
  ): Promise<WorkItemResponseDto> {
    const entity = await this.workItemsRepository.findById(id);
    if (!entity) {
      throw new NotFoundException('Work item não encontrado');
    }

    await this.validateStatusForProcess(dto.statusId, entity.processId);

    const updateData: Record<string, any> = { statusId: dto.statusId };

    // Check the new status category for auto-setting timestamps
    const newStatus = await this.workItemsRepository.findStatusById(
      dto.statusId,
    );
    if (newStatus) {
      // If moving to DONE, set completedAt
      if (newStatus.category === 'DONE' && !entity.completedAt) {
        updateData.completedAt = new Date();
      }
      // If moving to CLOSED, set closedAt
      if (newStatus.category === 'CLOSED' && !entity.closedAt) {
        updateData.closedAt = new Date();
      }
      // If moving back from DONE/CLOSED, clear timestamps
      if (
        newStatus.category !== 'DONE' &&
        newStatus.category !== 'CLOSED'
      ) {
        updateData.completedAt = null;
        updateData.closedAt = null;
      }
    }

    const updated = await this.workItemsRepository.update(id, updateData);
    return WorkItemResponseDto.fromEntity(updated);
  }

  async remove(id: string): Promise<void> {
    const entity = await this.workItemsRepository.findById(id);
    if (!entity) {
      throw new NotFoundException('Work item não encontrado');
    }
    await this.workItemsRepository.softDelete(id);
  }

  async reorder(dto: ReorderWorkItemsDto): Promise<void> {
    await this.workItemsRepository.bulkUpdateSortOrder(dto.items);
  }

  private async validateStatusForProcess(
    statusId: string,
    processId: string,
  ): Promise<void> {
    const status = await this.workItemsRepository.findStatusById(statusId);
    if (!status) {
      throw new NotFoundException('Status não encontrado');
    }

    const process =
      await this.workItemsRepository.findProcessById(processId);
    if (!process) {
      throw new NotFoundException('Processo não encontrado');
    }

    if (process.departmentId && status.departmentId !== process.departmentId) {
      throw new BadRequestException(
        'Status não pertence ao departamento do processo',
      );
    }
  }
}
