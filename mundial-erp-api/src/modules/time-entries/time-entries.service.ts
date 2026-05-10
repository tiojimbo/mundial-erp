import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { TimeEntriesRepository } from './time-entries.repository';
import { CreateTimeEntryDto } from './dtos/create-time-entry.dto';
import { StartTimeEntryDto } from './dtos/start-time-entry.dto';
import {
  TimeEntryResponseDto,
  type WorkItemTimeEntryShape,
} from './dtos/time-entry-response.dto';

@Injectable()
export class TimeEntriesService {
  private readonly logger = new Logger(TimeEntriesService.name);

  constructor(private readonly repository: TimeEntriesRepository) {}

  async findByTask(
    workspaceId: string,
    taskId: string,
  ): Promise<TimeEntryResponseDto[]> {
    const task = await this.repository.findTaskInWorkspace(workspaceId, taskId);
    if (!task) {
      throw new NotFoundException('Tarefa nao encontrada');
    }
    const rows = await this.repository.findByTask(workspaceId, taskId);
    return rows.map((row) =>
      TimeEntryResponseDto.fromEntity(row as unknown as WorkItemTimeEntryShape),
    );
  }

  async start(
    workspaceId: string,
    taskId: string,
    userId: string,
    dto: StartTimeEntryDto,
  ): Promise<TimeEntryResponseDto> {
    const task = await this.repository.findTaskInWorkspace(workspaceId, taskId);
    if (!task) {
      throw new NotFoundException('Tarefa nao encontrada');
    }

    const active = await this.repository.findActiveForUser(taskId, userId);
    if (active) {
      throw new ConflictException({
        message: 'Ja existe um timer ativo para esta task e usuario',
        code: 'TIME_ENTRY_ALREADY_RUNNING',
        entryId: active.id,
      });
    }

    const created = await this.repository.create({
      workItemId: taskId,
      userId,
      startTime: new Date(),
      description: dto.description,
    });

    this.logger.log(
      `time-entry.started task=${taskId} user=${userId} entry=${created.id}`,
    );

    return TimeEntryResponseDto.fromEntity(
      created as unknown as WorkItemTimeEntryShape,
    );
  }

  async stop(
    workspaceId: string,
    taskId: string,
    entryId: string,
    userId: string,
  ): Promise<TimeEntryResponseDto> {
    const task = await this.repository.findTaskInWorkspace(workspaceId, taskId);
    if (!task) {
      throw new NotFoundException('Tarefa nao encontrada');
    }
    const entry = await this.repository.findById(workspaceId, entryId);
    if (!entry || entry.workItemId !== taskId) {
      throw new NotFoundException('Registro de tempo nao encontrado');
    }
    if (entry.userId !== userId) {
      throw new ForbiddenException('Apenas o dono pode parar este timer');
    }
    if (entry.endTime !== null) {
      throw new BadRequestException('Timer ja foi parado');
    }

    const endTime = new Date();
    const durationSeconds = Math.max(
      1,
      Math.floor((endTime.getTime() - entry.startTime.getTime()) / 1000),
    );
    const updated = await this.repository.stop(
      entryId,
      endTime,
      durationSeconds,
    );

    this.logger.log(
      `time-entry.stopped task=${taskId} user=${userId} entry=${entryId} duration=${durationSeconds}s`,
    );

    return TimeEntryResponseDto.fromEntity(
      updated as unknown as WorkItemTimeEntryShape,
    );
  }

  async createManual(
    workspaceId: string,
    taskId: string,
    userId: string,
    dto: CreateTimeEntryDto,
  ): Promise<TimeEntryResponseDto> {
    const task = await this.repository.findTaskInWorkspace(workspaceId, taskId);
    if (!task) {
      throw new NotFoundException('Tarefa nao encontrada');
    }

    const startTime = new Date(dto.startTime);
    const endTime = new Date(dto.endTime);
    if (
      Number.isNaN(startTime.getTime()) ||
      Number.isNaN(endTime.getTime())
    ) {
      throw new BadRequestException('startTime/endTime invalidos');
    }
    if (endTime.getTime() <= startTime.getTime()) {
      throw new BadRequestException('endTime deve ser posterior a startTime');
    }

    const computed = Math.floor(
      (endTime.getTime() - startTime.getTime()) / 1000,
    );
    const durationSeconds = dto.durationSeconds ?? computed;
    if (durationSeconds <= 0) {
      throw new BadRequestException('durationSeconds deve ser positivo');
    }

    const created = await this.repository.create({
      workItemId: taskId,
      userId,
      startTime,
      endTime,
      durationSeconds,
      description: dto.description,
    });

    this.logger.log(
      `time-entry.manual task=${taskId} user=${userId} entry=${created.id} duration=${durationSeconds}s`,
    );

    return TimeEntryResponseDto.fromEntity(
      created as unknown as WorkItemTimeEntryShape,
    );
  }
}
