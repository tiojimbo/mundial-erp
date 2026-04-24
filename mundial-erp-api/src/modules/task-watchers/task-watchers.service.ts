import {
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { TaskWatchersRepository } from './task-watchers.repository';
import { WatcherResponseDto } from './dtos/watcher-response.dto';
import { TaskOutboxService } from '../task-outbox/task-outbox.service';

const OUTBOX_EVENT_WATCHER_ADDED = 'WATCHER_ADDED' as const;
const OUTBOX_EVENT_WATCHER_REMOVED = 'WATCHER_REMOVED' as const;

/**
 * Roles que podem adicionar/remover watchers de terceiros (nao o proprio user).
 */
const ROLES_MAY_MANAGE_OTHERS: ReadonlySet<Role> = new Set([
  Role.ADMIN,
  Role.MANAGER,
]);

@Injectable()
export class TaskWatchersService {
  private readonly logger = new Logger(TaskWatchersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly repository: TaskWatchersRepository,
    @Inject(forwardRef(() => TaskOutboxService))
    private readonly outbox: TaskOutboxService,
  ) {}

  async listWatchers(
    workspaceId: string,
    taskId: string,
  ): Promise<WatcherResponseDto[]> {
    const task = await this.repository.findTaskInWorkspace(workspaceId, taskId);
    if (!task) {
      throw new NotFoundException('Tarefa nao encontrada');
    }
    const watchers = await this.repository.findByTask(taskId);
    return watchers.map((w) => WatcherResponseDto.fromEntity(w));
  }

  async addWatcher(
    workspaceId: string,
    taskId: string,
    targetUserId: string,
    actor: { userId: string; role: Role },
  ): Promise<void> {
    const task = await this.repository.findTaskInWorkspace(workspaceId, taskId);
    if (!task) {
      throw new NotFoundException('Tarefa nao encontrada');
    }

    // Regra: self-add aberto a qualquer Operator+. Add-other: Manager+.
    const isSelf = targetUserId === actor.userId;
    if (!isSelf && !ROLES_MAY_MANAGE_OTHERS.has(actor.role)) {
      throw new ForbiddenException(
        'Apenas Manager ou Admin podem adicionar outros usuarios como watchers',
      );
    }

    const member = await this.repository.findMemberInWorkspace(
      workspaceId,
      targetUserId,
    );
    if (!member) {
      // Usuario nao e membro do workspace: cross-tenant → 404.
      throw new NotFoundException('Usuario nao encontrado no workspace');
    }

    const existing = await this.repository.findOne(taskId, targetUserId);
    if (existing) {
      // Idempotente.
      return;
    }

    try {
      await this.prisma.$transaction(async (tx) => {
        await this.repository.add(taskId, targetUserId, tx);
        // Enqueue outbox → worker cria Notification (§8.12, §8.11).
        await this.outbox.enqueue(tx, {
          aggregateId: taskId,
          eventType: OUTBOX_EVENT_WATCHER_ADDED,
          payload: {
            taskId,
            userId: targetUserId,
            actorId: actor.userId,
          },
          workspaceId,
        });
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        // Race — tx revertida; nada persistido (outbox inclusive). Idempotente.
        return;
      }
      throw error;
    }

    this.logger.log(
      `task-watcher.added task=${taskId} user=${targetUserId} actor=${actor.userId}`,
    );
  }

  async removeWatcher(
    workspaceId: string,
    taskId: string,
    targetUserId: string,
    actor: { userId: string; role: Role },
  ): Promise<void> {
    const task = await this.repository.findTaskInWorkspace(workspaceId, taskId);
    if (!task) {
      throw new NotFoundException('Tarefa nao encontrada');
    }

    const isSelf = targetUserId === actor.userId;
    if (!isSelf && !ROLES_MAY_MANAGE_OTHERS.has(actor.role)) {
      throw new ForbiddenException(
        'Apenas Manager ou Admin podem remover outros usuarios de watchers',
      );
    }

    const existing = await this.repository.findOne(taskId, targetUserId);
    if (!existing) {
      // Idempotente.
      return;
    }

    await this.prisma.$transaction(async (tx) => {
      await this.repository.remove(taskId, targetUserId, tx);
      await this.outbox.enqueue(tx, {
        aggregateId: taskId,
        eventType: OUTBOX_EVENT_WATCHER_REMOVED,
        payload: {
          taskId,
          userId: targetUserId,
          actorId: actor.userId,
        },
        workspaceId,
      });
    });

    this.logger.log(
      `task-watcher.removed task=${taskId} user=${targetUserId} actor=${actor.userId}`,
    );
  }
}
