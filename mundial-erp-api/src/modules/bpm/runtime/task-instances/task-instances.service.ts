import { Injectable, NotFoundException } from '@nestjs/common';
import { TaskStatus } from '@prisma/client';
import { TaskInstancesRepository } from './task-instances.repository';
import { TaskInstanceResponseDto } from './dto/task-instance-response.dto';
import { PaginationDto } from '../../../../common/dtos/pagination.dto';

@Injectable()
export class TaskInstancesService {
  constructor(
    private readonly taskInstancesRepository: TaskInstancesRepository,
  ) {}

  async findAll(
    pagination: PaginationDto,
    filters: { activityInstanceId?: string },
  ) {
    const { items, total } = await this.taskInstancesRepository.findMany({
      skip: pagination.skip,
      take: pagination.limit,
      ...filters,
    });

    return {
      items: items.map(TaskInstanceResponseDto.fromEntity),
      total,
    };
  }

  async findById(id: string): Promise<TaskInstanceResponseDto> {
    const instance = await this.taskInstancesRepository.findById(id);
    if (!instance) {
      throw new NotFoundException('Instância de tarefa não encontrada');
    }
    return TaskInstanceResponseDto.fromEntity(instance);
  }

  async toggle(
    id: string,
    userId: string,
  ): Promise<TaskInstanceResponseDto> {
    const instance = await this.taskInstancesRepository.findById(id);
    if (!instance) {
      throw new NotFoundException('Instância de tarefa não encontrada');
    }

    const isDone = instance.status === TaskStatus.DONE;

    const updated = await this.taskInstancesRepository.update(id, {
      status: isDone ? TaskStatus.PENDING : TaskStatus.DONE,
      completedBy: isDone
        ? { disconnect: true }
        : { connect: { id: userId } },
    });

    return TaskInstanceResponseDto.fromEntity(updated);
  }
}
