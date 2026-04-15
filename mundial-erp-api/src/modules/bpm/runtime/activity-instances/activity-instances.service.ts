import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ActivityStatus, TaskStatus } from '@prisma/client';
import { ActivityInstancesRepository } from './activity-instances.repository';
import { CreateActivityInstanceDto } from './dto/create-activity-instance.dto';
import { ActivityInstanceResponseDto } from './dto/activity-instance-response.dto';
import { DailyActivityResponseDto } from './dto/daily-activity-response.dto';
import { PaginationDto } from '../../../../common/dtos/pagination.dto';

@Injectable()
export class ActivityInstancesService {
  constructor(
    private readonly activityInstancesRepository: ActivityInstancesRepository,
  ) {}

  async findDaily(userId: string) {
    const { items, total } =
      await this.activityInstancesRepository.findDailyByUser(userId);

    return {
      activities: items.map(DailyActivityResponseDto.fromEntity),
      total,
    };
  }

  async create(
    dto: CreateActivityInstanceDto,
  ): Promise<ActivityInstanceResponseDto> {
    const instance = await this.activityInstancesRepository.create({
      activity: { connect: { id: dto.activityId } },
      processInstance: { connect: { id: dto.processInstanceId } },
    });

    return ActivityInstanceResponseDto.fromEntity(instance);
  }

  async findAll(
    pagination: PaginationDto,
    filters: {
      processInstanceId?: string;
      assignedUserId?: string;
      status?: ActivityStatus;
    },
  ) {
    const { items, total } =
      await this.activityInstancesRepository.findMany({
        skip: pagination.skip,
        take: pagination.limit,
        ...filters,
      });

    return {
      items: items.map(ActivityInstanceResponseDto.fromEntity),
      total,
    };
  }

  async findById(id: string): Promise<ActivityInstanceResponseDto> {
    const instance = await this.activityInstancesRepository.findById(id);
    if (!instance) {
      throw new NotFoundException('Instância de atividade não encontrada');
    }
    return ActivityInstanceResponseDto.fromEntity(instance);
  }

  async assign(
    id: string,
    userId: string,
  ): Promise<ActivityInstanceResponseDto> {
    const instance = await this.activityInstancesRepository.findById(id);
    if (!instance) {
      throw new NotFoundException('Instância de atividade não encontrada');
    }

    const updated = await this.activityInstancesRepository.update(id, {
      assignedUser: { connect: { id: userId } },
      status: ActivityStatus.IN_PROGRESS,
      startedAt: new Date(),
    });

    return ActivityInstanceResponseDto.fromEntity(updated);
  }

  async complete(id: string): Promise<ActivityInstanceResponseDto> {
    const instance =
      await this.activityInstancesRepository.findByIdWithMandatoryTasks(id);
    if (!instance) {
      throw new NotFoundException('Instância de atividade não encontrada');
    }

    const pendingMandatoryTasks = instance.taskInstances.filter(
      (ti: { task: { isMandatory: boolean }; status: string }) =>
        ti.task.isMandatory && ti.status !== TaskStatus.DONE,
    );

    if (pendingMandatoryTasks.length > 0) {
      throw new BadRequestException(
        'Existem tarefas obrigatórias pendentes. Complete todas antes de finalizar a atividade.',
      );
    }

    const updated = await this.activityInstancesRepository.update(id, {
      status: ActivityStatus.COMPLETED,
      completedAt: new Date(),
    });

    return ActivityInstanceResponseDto.fromEntity(updated);
  }
}
