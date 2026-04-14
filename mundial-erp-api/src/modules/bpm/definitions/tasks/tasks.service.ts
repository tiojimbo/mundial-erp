import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { TasksRepository } from './tasks.repository';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TaskResponseDto } from './dto/task-response.dto';
import { PaginationDto } from '../../../../common/dtos/pagination.dto';

@Injectable()
export class TasksService {
  constructor(private readonly tasksRepository: TasksRepository) {}

  async create(dto: CreateTaskDto): Promise<TaskResponseDto> {
    const entity = await this.tasksRepository.create({
      description: dto.description,
      activity: { connect: { id: dto.activityId } },
      sortOrder: dto.sortOrder ?? 0,
      isMandatory: dto.isMandatory ?? true,
    });

    return TaskResponseDto.fromEntity(entity);
  }

  async findAll(pagination: PaginationDto) {
    const { items, total } = await this.tasksRepository.findMany({
      skip: pagination.skip,
      take: pagination.limit,
    });
    return {
      items: items.map(TaskResponseDto.fromEntity),
      total,
    };
  }

  async findById(id: string): Promise<TaskResponseDto> {
    const entity = await this.tasksRepository.findById(id);
    if (!entity) {
      throw new NotFoundException('Task não encontrada');
    }
    return TaskResponseDto.fromEntity(entity);
  }

  async update(id: string, dto: UpdateTaskDto): Promise<TaskResponseDto> {
    const entity = await this.tasksRepository.findById(id);
    if (!entity) {
      throw new NotFoundException('Task não encontrada');
    }

    const updateData: Record<string, any> = {};
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.activityId !== undefined) {
      updateData.activity = { connect: { id: dto.activityId } };
    }
    if (dto.sortOrder !== undefined) updateData.sortOrder = dto.sortOrder;
    if (dto.isMandatory !== undefined) updateData.isMandatory = dto.isMandatory;

    const updated = await this.tasksRepository.update(id, updateData);
    return TaskResponseDto.fromEntity(updated);
  }

  async remove(id: string): Promise<void> {
    const entity = await this.tasksRepository.findById(id);
    if (!entity) {
      throw new NotFoundException('Task não encontrada');
    }
    await this.tasksRepository.softDelete(id);
  }
}
