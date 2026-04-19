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
import type {
  MyTaskDto,
  MyTasksResponseDto,
  MyTasksDayGroupDto,
} from './dto/my-tasks-response.dto';

@Injectable()
export class WorkItemsService {
  constructor(private readonly workItemsRepository: WorkItemsRepository) {}

  async getMyTasks(
    workspaceId: string,
    userId: string,
  ): Promise<MyTasksResponseDto> {
    const items = await this.workItemsRepository.findByAssignee(
      workspaceId,
      userId,
    );

    const now = new Date();
    const todayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );
    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);
    const sevenDaysFromNow = new Date(todayStart);
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 8);
    const sevenDaysAgo = new Date(todayStart);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const overdue: MyTaskDto[] = [];
    const dueToday: MyTaskDto[] = [];
    const dueTomorrow: MyTaskDto[] = [];
    const upcoming: MyTaskDto[] = [];
    const noDueDate: MyTaskDto[] = [];
    const recentlyCompleted: MyTaskDto[] = [];
    const dueByDayMap = new Map<string, { date: Date; tasks: MyTaskDto[] }>();

    for (let i = 2; i <= 7; i++) {
      const d = new Date(todayStart);
      d.setDate(d.getDate() + i);
      const key = d.toISOString().split('T')[0];
      dueByDayMap.set(key, { date: d, tasks: [] });
    }

    for (const item of items) {
      const task = this.mapToMyTask(item);

      if (item.completedAt && item.completedAt >= sevenDaysAgo) {
        recentlyCompleted.push(task);
        continue;
      }

      if (item.closedAt) continue;
      if (item.completedAt) continue;

      if (!item.dueDate) {
        noDueDate.push(task);
        continue;
      }

      const due = new Date(item.dueDate);
      const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate());

      if (dueDay < todayStart) {
        overdue.push(task);
      } else if (dueDay.getTime() === todayStart.getTime()) {
        dueToday.push(task);
      } else if (dueDay.getTime() === tomorrowStart.getTime()) {
        dueTomorrow.push(task);
      } else if (dueDay < sevenDaysFromNow) {
        const key = dueDay.toISOString().split('T')[0];
        const slot = dueByDayMap.get(key);
        if (slot) {
          slot.tasks.push(task);
        } else {
          upcoming.push(task);
        }
      } else {
        upcoming.push(task);
      }
    }

    const dueByDay: MyTasksDayGroupDto[] = [];
    for (const [key, value] of dueByDayMap) {
      const dayLabel = this.formatDayLabel(value.date);
      dueByDay.push({
        id: key,
        date: value.date.toISOString(),
        label: dayLabel,
        tasks: value.tasks,
      });
    }

    const dueNextDaysCount = dueByDay.reduce(
      (sum, g) => sum + g.tasks.length,
      0,
    );

    const summary = {
      overdueCount: overdue.length,
      dueTodayCount: dueToday.length,
      dueTomorrowCount: dueTomorrow.length,
      dueNextSevenDaysCount: dueTomorrow.length + dueNextDaysCount,
      dueNextDaysCount,
      upcomingCount: upcoming.length,
      noDueDateCount: noDueDate.length,
      completedCount: recentlyCompleted.length,
      totalActive:
        overdue.length +
        dueToday.length +
        dueTomorrow.length +
        dueNextDaysCount +
        upcoming.length +
        noDueDate.length,
    };

    return {
      summary,
      overdue,
      dueToday,
      dueTomorrow,
      dueByDay,
      upcoming,
      noDueDate,
      recentlyCompleted,
    };
  }

  private mapToMyTask(item: any): MyTaskDto {
    const assignees: { id: string; name: string; email: string }[] = [];
    if (item.assignee) {
      assignees.push({
        id: item.assignee.id,
        name: item.assignee.name,
        email: item.assignee.email,
      });
    }

    return {
      id: item.id,
      name: item.title,
      priority: item.priority ?? null,
      dueDate: item.dueDate?.toISOString() ?? null,
      startDate: item.startDate?.toISOString() ?? null,
      status: {
        id: item.status?.id ?? '',
        name: item.status?.name ?? '',
        color: item.status?.color ?? '#888888',
        type: item.status?.category ?? 'NOT_STARTED',
      },
      list: {
        id: item.process?.id ?? '',
        name: item.process?.name ?? '',
        folder: item.process?.department?.name ?? null,
      },
      assignees,
      taskType: item.itemType ?? null,
      createdAt: item.createdAt.toISOString(),
      dateDone: item.completedAt?.toISOString() ?? null,
    };
  }

  private formatDayLabel(date: Date): string {
    const weekdays = [
      'Domingo',
      'Segunda-feira',
      'Terça-feira',
      'Quarta-feira',
      'Quinta-feira',
      'Sexta-feira',
      'Sábado',
    ];
    const months = [
      'jan.',
      'fev.',
      'mar.',
      'abr.',
      'mai.',
      'jun.',
      'jul.',
      'ago.',
      'set.',
      'out.',
      'nov.',
      'dez.',
    ];
    const dayName = weekdays[date.getDay()];
    const day = date.getDate();
    const month = months[date.getMonth()];
    return `${dayName} \u00b7 ${day} de ${month}`;
  }

  async create(
    workspaceId: string,
    dto: CreateWorkItemDto,
    creatorId: string,
  ): Promise<WorkItemResponseDto> {
    const process = await this.workItemsRepository.findProcessById(
      workspaceId,
      dto.processId,
    );
    if (!process) {
      throw new NotFoundException('Processo não encontrado');
    }

    const status = await this.workItemsRepository.findStatusById(
      workspaceId,
      dto.statusId,
    );
    if (!status) {
      throw new NotFoundException('Status não encontrado');
    }

    if (process.departmentId && status.departmentId !== process.departmentId) {
      throw new BadRequestException(
        'Status não pertence ao departamento do processo',
      );
    }

    const entity = await this.workItemsRepository.create(workspaceId, {
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

  async findAll(workspaceId: string, filters: WorkItemFiltersDto) {
    const { items, total } = await this.workItemsRepository.findMany(
      workspaceId,
      {
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
      },
    );

    return {
      items: items.map(WorkItemResponseDto.fromEntity),
      total,
    };
  }

  async findGrouped(
    workspaceId: string,
    processId: string,
    showClosed = false,
  ) {
    const process = await this.workItemsRepository.findProcessById(
      workspaceId,
      processId,
    );
    if (!process) {
      throw new NotFoundException('Processo não encontrado');
    }

    const { items, statuses } =
      await this.workItemsRepository.findGroupedByStatus(
        workspaceId,
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

    for (const item of items) {
      let group = groupMap.get(item.statusId);
      if (!group) {
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

  async findById(
    workspaceId: string,
    id: string,
  ): Promise<WorkItemResponseDto> {
    const entity = await this.workItemsRepository.findById(workspaceId, id);
    if (!entity) {
      throw new NotFoundException('Work item não encontrado');
    }
    return WorkItemResponseDto.fromEntity(entity);
  }

  async update(
    workspaceId: string,
    id: string,
    dto: UpdateWorkItemDto,
  ): Promise<WorkItemResponseDto> {
    const entity = await this.workItemsRepository.findById(workspaceId, id);
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
      await this.validateStatusForProcess(
        workspaceId,
        dto.statusId,
        entity.processId,
      );
      updateData.statusId = dto.statusId;
    }

    if (dto.processId !== undefined && dto.processId !== entity.processId) {
      const process = await this.workItemsRepository.findProcessById(
        workspaceId,
        dto.processId,
      );
      if (!process) {
        throw new NotFoundException('Processo não encontrado');
      }
      updateData.processId = dto.processId;
    }

    const updated = await this.workItemsRepository.update(
      workspaceId,
      id,
      updateData,
    );
    return WorkItemResponseDto.fromEntity(updated);
  }

  async changeStatus(
    workspaceId: string,
    id: string,
    dto: ChangeStatusDto,
  ): Promise<WorkItemResponseDto> {
    const entity = await this.workItemsRepository.findById(workspaceId, id);
    if (!entity) {
      throw new NotFoundException('Work item não encontrado');
    }

    await this.validateStatusForProcess(
      workspaceId,
      dto.statusId,
      entity.processId,
    );

    const updateData: Record<string, any> = { statusId: dto.statusId };

    const newStatus = await this.workItemsRepository.findStatusById(
      workspaceId,
      dto.statusId,
    );
    if (newStatus) {
      if (newStatus.category === 'DONE' && !entity.completedAt) {
        updateData.completedAt = new Date();
      }
      if (newStatus.category === 'CLOSED' && !entity.closedAt) {
        updateData.closedAt = new Date();
      }
      if (newStatus.category !== 'DONE' && newStatus.category !== 'CLOSED') {
        updateData.completedAt = null;
        updateData.closedAt = null;
      }
    }

    const updated = await this.workItemsRepository.update(
      workspaceId,
      id,
      updateData,
    );
    return WorkItemResponseDto.fromEntity(updated);
  }

  async remove(workspaceId: string, id: string): Promise<void> {
    const entity = await this.workItemsRepository.findById(workspaceId, id);
    if (!entity) {
      throw new NotFoundException('Work item não encontrado');
    }
    await this.workItemsRepository.softDelete(workspaceId, id);
  }

  async reorder(workspaceId: string, dto: ReorderWorkItemsDto): Promise<void> {
    // Validar que todos os ids pertencem ao workspace
    for (const item of dto.items) {
      const entity = await this.workItemsRepository.findById(
        workspaceId,
        item.id,
      );
      if (!entity) {
        throw new NotFoundException(`Work item ${item.id} não encontrado`);
      }
    }
    await this.workItemsRepository.bulkUpdateSortOrder(workspaceId, dto.items);
  }

  private async validateStatusForProcess(
    workspaceId: string,
    statusId: string,
    processId: string,
  ): Promise<void> {
    const status = await this.workItemsRepository.findStatusById(
      workspaceId,
      statusId,
    );
    if (!status) {
      throw new NotFoundException('Status não encontrado');
    }

    const process = await this.workItemsRepository.findProcessById(
      workspaceId,
      processId,
    );
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
