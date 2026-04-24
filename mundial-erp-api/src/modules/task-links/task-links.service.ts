/**
 * TaskLinksService — PLANO-TASKS.md §7.3 (Links).
 *
 * Links sao "see-also" simetricos entre duas tasks do mesmo workspace.
 * Diferente de `Dependencies`, NAO ha grafo direcionado nem cycle detection:
 * qualquer par `{A,B}` pode ser ligado contanto que ambas pertencam ao mesmo
 * workspace. Duplicatas (inclusive na direcao inversa) sao idempotentes.
 */

import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { TaskOutboxService } from '../task-outbox/task-outbox.service';
import { TaskLinksRepository, type LinkEdge } from './task-links.repository';
import {
  TaskLinksResponseDto,
  WorkItemLinkSummaryDto,
  type WorkItemLinkSummaryShape,
} from './dtos/link-response.dto';

const OUTBOX_EVENT_LINK_ADDED = 'LINK_ADDED' as const;
const OUTBOX_EVENT_LINK_REMOVED = 'LINK_REMOVED' as const;

function mapSummary(task: unknown): WorkItemLinkSummaryDto {
  const t = task as {
    id: string;
    title: string;
    statusId: string;
    priority: string | null;
    dueDate: Date | null;
    primaryAssigneeCache: string | null;
    archived: boolean;
    status: { category: string } | null;
  };
  const shape: WorkItemLinkSummaryShape = {
    id: t.id,
    title: t.title,
    statusId: t.statusId,
    statusCategory: t.status?.category ?? null,
    priority: t.priority,
    dueDate: t.dueDate,
    primaryAssigneeId: t.primaryAssigneeCache,
    archived: t.archived,
  };
  return WorkItemLinkSummaryDto.fromEntity(shape);
}

@Injectable()
export class TaskLinksService {
  private readonly logger = new Logger(TaskLinksService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly repository: TaskLinksRepository,
    private readonly outbox: TaskOutboxService,
  ) {}

  async findAll(
    workspaceId: string,
    taskId: string,
  ): Promise<TaskLinksResponseDto> {
    const task = await this.repository.findTaskInWorkspace(workspaceId, taskId);
    if (!task) {
      throw new NotFoundException('Tarefa nao encontrada');
    }

    const [outgoing, incoming] = await Promise.all([
      this.repository.findOutgoing(workspaceId, taskId),
      this.repository.findIncoming(workspaceId, taskId),
    ]);

    // UNION em memoria — deduplicamos por id do outro lado. Um par simetrico
    // `A<->B` tem UMA linha no banco (uma direcao), entao na pratica nao deve
    // haver duplicatas aqui; fazemos a desduplicacao defensivamente.
    const seen = new Set<string>();
    const links: WorkItemLinkSummaryDto[] = [];
    for (const row of outgoing) {
      const dto = mapSummary((row as { toTask: unknown }).toTask);
      if (!seen.has(dto.id)) {
        seen.add(dto.id);
        links.push(dto);
      }
    }
    for (const row of incoming) {
      const dto = mapSummary((row as { fromTask: unknown }).fromTask);
      if (!seen.has(dto.id)) {
        seen.add(dto.id);
        links.push(dto);
      }
    }

    const response = new TaskLinksResponseDto();
    response.links = links;
    return response;
  }

  async create(
    workspaceId: string,
    taskId: string,
    linksToId: string,
    actorUserId: string,
  ): Promise<void> {
    if (taskId === linksToId) {
      throw new BadRequestException('Uma task nao pode ser linkada a si mesma');
    }

    const edge: LinkEdge = { fromTaskId: taskId, toTaskId: linksToId };

    await this.prisma.$transaction(async (tx) => {
      const [fromTask, toTask] = await Promise.all([
        this.repository.findTaskInWorkspace(workspaceId, taskId, tx),
        this.repository.findTaskInWorkspace(workspaceId, linksToId, tx),
      ]);
      if (!fromTask || !toTask) {
        throw new NotFoundException('Tarefa nao encontrada');
      }

      // Link e simetrico: checagem em ambas as direcoes para idempotencia.
      const existing = await this.repository.findEdgeAnyDirection(
        taskId,
        linksToId,
        tx,
      );
      if (existing) {
        // No-op — link ja existe.
        return;
      }

      try {
        await this.repository.createEdge(edge, tx);
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002'
        ) {
          // Race — outro request criou no intervalo. Idempotente.
          return;
        }
        throw error;
      }

      await this.outbox.enqueue(tx, {
        aggregateId: taskId,
        eventType: OUTBOX_EVENT_LINK_ADDED,
        payload: {
          fromTaskId: taskId,
          toTaskId: linksToId,
          actorId: actorUserId,
        },
        workspaceId,
      });
    });

    this.logger.log(
      `task-link.created from=${taskId} to=${linksToId} actor=${actorUserId}`,
    );
  }

  async remove(
    workspaceId: string,
    taskId: string,
    linksToId: string,
    actorUserId: string,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const [fromTask, toTask] = await Promise.all([
        this.repository.findTaskInWorkspace(workspaceId, taskId, tx),
        this.repository.findTaskInWorkspace(workspaceId, linksToId, tx),
      ]);
      if (!fromTask || !toTask) {
        throw new NotFoundException('Tarefa nao encontrada');
      }

      const existing = await this.repository.findEdgeAnyDirection(
        taskId,
        linksToId,
        tx,
      );
      if (!existing) {
        // Idempotencia: remover link inexistente e no-op.
        return;
      }

      // A aresta real no banco tem UMA direcao; removemos na direcao correta.
      await this.repository.deleteEdge(
        {
          fromTaskId: existing.fromTaskId,
          toTaskId: existing.toTaskId,
        },
        tx,
      );

      await this.outbox.enqueue(tx, {
        aggregateId: taskId,
        eventType: OUTBOX_EVENT_LINK_REMOVED,
        payload: {
          fromTaskId: existing.fromTaskId,
          toTaskId: existing.toTaskId,
          actorId: actorUserId,
        },
        workspaceId,
      });
    });

    this.logger.log(
      `task-link.removed from=${taskId} to=${linksToId} actor=${actorUserId}`,
    );
  }
}
