/**
 * TaskDependenciesService
 *
 * Orquestra R1-R4 do §7.3 do PLANO-TASKS.md:
 *  - R1: body exige EXATAMENTE UM de `dependsOn`/`dependencyOf` (validator no DTO).
 *  - R2: cycle detection roda em `$transaction` via {@link CycleDetectorService}
 *        com node-limit=1000 e timeout=2s. Ciclo detectado -> 409.
 *  - R3: tasks em workspaces diferentes -> 404 (nao 403) §8.1.
 *  - R4: ao remover uma aresta cuja origem (`from`) esta em DONE/CLOSED,
 *        emite `DEPENDENCY_UNBLOCKED` alem de `DEPENDENCY_REMOVED` para o
 *        worker do outbox notificar watchers da task que estava esperando.
 */

import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CycleDetectorService } from '../../common/services/cycle-detector.service';
import { CycleDependencyException } from '../../common/exceptions/cycle-dependency.exception';
import { PrismaService } from '../../database/prisma.service';
import { TaskOutboxService } from '../task-outbox/task-outbox.service';
import {
  TaskDependenciesRepository,
  type DependencyEdge,
} from './task-dependencies.repository';
import { CreateDependencyDto } from './dtos/create-dependency.dto';
import { DeleteDependencyQueryDto } from './dtos/delete-dependency.query.dto';
import {
  TaskDependenciesResponseDto,
  WorkItemDependencySummaryDto,
  type WorkItemDependencySummaryShape,
} from './dtos/task-dependency-response.dto';

const OUTBOX_EVENT_DEPENDENCY_ADDED = 'DEPENDENCY_ADDED' as const;
const OUTBOX_EVENT_DEPENDENCY_REMOVED = 'DEPENDENCY_REMOVED' as const;
const OUTBOX_EVENT_DEPENDENCY_UNBLOCKED = 'DEPENDENCY_UNBLOCKED' as const;

/**
 * Shape normalizado da aresta a criar ou remover apos resolver qual dos
 * campos opcionais foi informado. Centralizado aqui para evitar branching
 * duplicado em create/remove.
 *
 * Convencao:
 *   - `dependsOn = X`  ->  `from=X, to=taskId` (X bloqueia taskId).
 *   - `dependencyOf = Y` -> `from=taskId, to=Y` (taskId bloqueia Y).
 */
function resolveEdge(
  taskId: string,
  dependsOn?: string,
  dependencyOf?: string,
): DependencyEdge {
  if (dependsOn) {
    return { fromTaskId: dependsOn, toTaskId: taskId };
  }
  if (dependencyOf) {
    return { fromTaskId: taskId, toTaskId: dependencyOf };
  }
  // Invariante: o DTO garante EXATAMENTE UM. Defensive — nunca deve disparar.
  throw new Error(
    'resolveEdge chamado sem dependsOn nem dependencyOf — violou DTO invariant.',
  );
}

function mapSummary(task: unknown): WorkItemDependencySummaryDto {
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
  const shape: WorkItemDependencySummaryShape = {
    id: t.id,
    title: t.title,
    statusId: t.statusId,
    statusCategory: t.status?.category ?? null,
    priority: t.priority,
    dueDate: t.dueDate,
    primaryAssigneeId: t.primaryAssigneeCache,
    archived: t.archived,
  };
  return WorkItemDependencySummaryDto.fromEntity(shape);
}

@Injectable()
export class TaskDependenciesService {
  private readonly logger = new Logger(TaskDependenciesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly repository: TaskDependenciesRepository,
    private readonly cycleDetector: CycleDetectorService,
    private readonly outbox: TaskOutboxService,
  ) {}

  async findAll(
    workspaceId: string,
    taskId: string,
  ): Promise<TaskDependenciesResponseDto> {
    const task = await this.repository.findTaskInWorkspace(workspaceId, taskId);
    if (!task) {
      throw new NotFoundException('Tarefa nao encontrada');
    }

    const [blockingRows, waitingRows] = await Promise.all([
      this.repository.findBlocking(workspaceId, taskId),
      this.repository.findWaitingOn(workspaceId, taskId),
    ]);

    const response = new TaskDependenciesResponseDto();
    response.blocking = blockingRows.map((row) =>
      mapSummary((row as { toTask: unknown }).toTask),
    );
    response.waitingOn = waitingRows.map((row) =>
      mapSummary((row as { fromTask: unknown }).fromTask),
    );
    return response;
  }

  async create(
    workspaceId: string,
    taskId: string,
    dto: CreateDependencyDto,
    actorUserId: string,
  ): Promise<void> {
    const edge = resolveEdge(taskId, dto.dependsOn, dto.dependencyOf);

    await this.prisma.$transaction(async (tx) => {
      // Ambas as tasks precisam pertencer ao mesmo workspace — cross-tenant 404.
      const [fromTask, toTask] = await Promise.all([
        this.repository.findTaskInWorkspace(workspaceId, edge.fromTaskId, tx),
        this.repository.findTaskInWorkspace(workspaceId, edge.toTaskId, tx),
      ]);
      if (!fromTask || !toTask) {
        throw new NotFoundException('Tarefa nao encontrada');
      }

      // Idempotencia: aresta ja existe -> 409 explicito (nao silencioso, pois
      // a UI precisa saber para nao re-renderizar fora de estado).
      const existing = await this.repository.findEdge(
        edge.fromTaskId,
        edge.toTaskId,
        tx,
      );
      if (existing) {
        throw new ConflictException({
          message: 'Esta dependencia ja existe',
          code: 'DEPENDENCY_ALREADY_EXISTS',
        });
      }

      // Cycle detection DENTRO da transacao para usar o mesmo snapshot.
      const wouldCycle = await this.cycleDetector.detectCycle({
        fromId: edge.fromTaskId,
        toId: edge.toTaskId,
        relation: 'dependency',
        tx,
      });
      if (wouldCycle) {
        throw new CycleDependencyException(
          `${edge.fromTaskId} -> ${edge.toTaskId}`,
        );
      }

      try {
        await this.repository.createEdge(edge, tx);
      } catch (error) {
        // Race: dois requests simultaneos tentando a mesma aresta.
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002'
        ) {
          throw new ConflictException({
            message: 'Esta dependencia ja existe',
            code: 'DEPENDENCY_ALREADY_EXISTS',
          });
        }
        throw error;
      }

      await this.outbox.enqueue(tx, {
        aggregateId: edge.toTaskId,
        eventType: OUTBOX_EVENT_DEPENDENCY_ADDED,
        payload: {
          fromTaskId: edge.fromTaskId,
          toTaskId: edge.toTaskId,
          actorId: actorUserId,
        },
        workspaceId,
      });
    });

    this.logger.log(
      `task-dependency.created from=${edge.fromTaskId} to=${edge.toTaskId} actor=${actorUserId}`,
    );
  }

  async remove(
    workspaceId: string,
    taskId: string,
    query: DeleteDependencyQueryDto,
    actorUserId: string,
  ): Promise<void> {
    const edge = resolveEdge(taskId, query.dependsOn, query.dependencyOf);

    await this.prisma.$transaction(async (tx) => {
      const [fromTask, toTask] = await Promise.all([
        this.repository.findTaskInWorkspace(workspaceId, edge.fromTaskId, tx),
        this.repository.findTaskInWorkspace(workspaceId, edge.toTaskId, tx),
      ]);
      if (!fromTask || !toTask) {
        throw new NotFoundException('Tarefa nao encontrada');
      }

      const existing = await this.repository.findEdge(
        edge.fromTaskId,
        edge.toTaskId,
        tx,
      );
      if (!existing) {
        // Idempotencia: remove de aresta inexistente e no-op silencioso.
        return;
      }

      await this.repository.deleteEdge(edge, tx);

      await this.outbox.enqueue(tx, {
        aggregateId: edge.toTaskId,
        eventType: OUTBOX_EVENT_DEPENDENCY_REMOVED,
        payload: {
          fromTaskId: edge.fromTaskId,
          toTaskId: edge.toTaskId,
          actorId: actorUserId,
        },
        workspaceId,
      });

      // R4: se a task que bloqueava (source) ja estava concluida, avisar o
      // worker para que este gere a notificacao `DEPENDENCY_UNBLOCKED` para
      // os watchers da task que agora esta liberada.
      const sourceCategory = fromTask.status?.category;
      if (sourceCategory === 'DONE' || sourceCategory === 'CLOSED') {
        await this.outbox.enqueue(tx, {
          aggregateId: edge.toTaskId,
          eventType: OUTBOX_EVENT_DEPENDENCY_UNBLOCKED,
          payload: {
            unblockedTaskId: edge.toTaskId,
            sourceTaskId: edge.fromTaskId,
            reason: 'DEPENDENCY_REMOVED',
            actorId: actorUserId,
          },
          workspaceId,
        });
      }
    });

    this.logger.log(
      `task-dependency.removed from=${edge.fromTaskId} to=${edge.toTaskId} actor=${actorUserId}`,
    );
  }
}
