import {
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { TaskTagsRepository } from './task-tags.repository';
import { CreateTaskTagDto } from './dtos/create-task-tag.dto';
import { UpdateTaskTagDto } from './dtos/update-task-tag.dto';
import { TaskTagFiltersDto } from './dtos/task-tag-filters.dto';
import { TaskTagResponseDto } from './dtos/task-tag-response.dto';
import { TaskOutboxService } from '../task-outbox/task-outbox.service';

/**
 * Eventos de outbox emitidos por este servico. Espelham os valores de
 * `TaskActivityType` usados pelo worker (ADR-003 + PLANO-TASKS.md §5.1).
 */
const OUTBOX_EVENT_TAG_ADDED = 'TAG_ADDED' as const;
const OUTBOX_EVENT_TAG_REMOVED = 'TAG_REMOVED' as const;

@Injectable()
export class TaskTagsService {
  private readonly logger = new Logger(TaskTagsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly repository: TaskTagsRepository,
    // forwardRef para evitar ciclo eventual entre task-tags e task-outbox
    @Inject(forwardRef(() => TaskOutboxService))
    private readonly outbox: TaskOutboxService,
  ) {}

  /**
   * Normaliza nome para unicidade case-insensitive.
   * PLANO-TASKS.md §8.9: `nameLower = LOWER(TRIM(name))`.
   */
  private toNameLower(name: string): string {
    return name.trim().toLowerCase();
  }

  async findAll(workspaceId: string, filters: TaskTagFiltersDto) {
    const { items, total } = await this.repository.findMany(workspaceId, {
      skip: filters.skip,
      take: filters.limit,
      search: filters.search,
    });
    return {
      items: items.map((entity) => TaskTagResponseDto.fromEntity(entity)),
      total,
    };
  }

  async create(
    workspaceId: string,
    dto: CreateTaskTagDto,
  ): Promise<TaskTagResponseDto> {
    const nameLower = this.toNameLower(dto.name);

    try {
      const entity = await this.repository.create({
        workspaceId,
        name: dto.name.trim(),
        nameLower,
        color: dto.color,
        bgColor: dto.bgColor,
      });
      return TaskTagResponseDto.fromEntity(entity);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        // Unique violation (workspaceId, nameLower). Retorna a tag existente
        // no payload da excecao para que a UI possa reaproveitar.
        const existing = await this.repository.findByNameLower(
          workspaceId,
          nameLower,
        );
        throw new ConflictException({
          message: 'Ja existe uma tag com este nome neste workspace',
          code: 'TASK_TAG_ALREADY_EXISTS',
          tag: existing ? TaskTagResponseDto.fromEntity(existing) : null,
        });
      }
      throw error;
    }
  }

  async update(
    workspaceId: string,
    id: string,
    dto: UpdateTaskTagDto,
  ): Promise<TaskTagResponseDto> {
    const existing = await this.repository.findById(workspaceId, id);
    if (!existing) {
      throw new NotFoundException('Tag nao encontrada');
    }

    const data: {
      name?: string;
      nameLower?: string;
      color?: string | null;
      bgColor?: string | null;
    } = {};

    if (dto.name !== undefined) {
      data.name = dto.name.trim();
      data.nameLower = this.toNameLower(dto.name);
    }
    if (dto.color !== undefined) data.color = dto.color;
    if (dto.bgColor !== undefined) data.bgColor = dto.bgColor;

    try {
      const updated = await this.repository.update(workspaceId, id, data);
      return TaskTagResponseDto.fromEntity(updated);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException({
          message: 'Ja existe uma tag com este nome neste workspace',
          code: 'TASK_TAG_ALREADY_EXISTS',
        });
      }
      throw error;
    }
  }

  async remove(workspaceId: string, id: string): Promise<void> {
    const existing = await this.repository.findById(workspaceId, id);
    if (!existing) {
      throw new NotFoundException('Tag nao encontrada');
    }
    await this.repository.softDelete(workspaceId, id);
  }

  async attach(
    workspaceId: string,
    taskId: string,
    tagId: string,
    actorUserId: string,
  ): Promise<void> {
    const task = await this.repository.findTaskInWorkspace(workspaceId, taskId);
    if (!task) {
      // Cross-tenant nunca vaza 403 — §8.1
      throw new NotFoundException('Tarefa nao encontrada');
    }
    const tag = await this.repository.findById(workspaceId, tagId);
    if (!tag) {
      throw new NotFoundException('Tag nao encontrada');
    }

    const existingLink = await this.repository.findLink(taskId, tagId);
    if (existingLink) {
      // Idempotencia: attach de link existente nao reemite evento.
      return;
    }

    try {
      await this.prisma.$transaction(async (tx) => {
        await this.repository.attach(taskId, tagId, tx);
        await this.outbox.enqueue(tx, {
          aggregateId: taskId,
          eventType: OUTBOX_EVENT_TAG_ADDED,
          payload: {
            taskId,
            tagId,
            tagName: tag.name,
            actorId: actorUserId,
          },
          workspaceId,
        });
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        // Race condition — outro request atachou no intervalo. Idempotente.
        // Tx foi revertida; outbox nao foi persistido — correto.
        return;
      }
      throw error;
    }

    this.logger.log(
      `task-tag.attached task=${taskId} tag=${tagId} actor=${actorUserId}`,
    );
  }

  async detach(
    workspaceId: string,
    taskId: string,
    tagId: string,
    actorUserId: string,
  ): Promise<void> {
    const task = await this.repository.findTaskInWorkspace(workspaceId, taskId);
    if (!task) {
      throw new NotFoundException('Tarefa nao encontrada');
    }
    const tag = await this.repository.findById(workspaceId, tagId);
    if (!tag) {
      throw new NotFoundException('Tag nao encontrada');
    }

    const existingLink = await this.repository.findLink(taskId, tagId);
    if (!existingLink) {
      // Idempotencia: detach de tag nao associada e no-op.
      return;
    }

    await this.prisma.$transaction(async (tx) => {
      await this.repository.detach(taskId, tagId, tx);
      await this.outbox.enqueue(tx, {
        aggregateId: taskId,
        eventType: OUTBOX_EVENT_TAG_REMOVED,
        payload: {
          taskId,
          tagId,
          tagName: tag.name,
          actorId: actorUserId,
        },
        workspaceId,
      });
    });

    this.logger.log(
      `task-tag.detached task=${taskId} tag=${tagId} actor=${actorUserId}`,
    );
  }
}
