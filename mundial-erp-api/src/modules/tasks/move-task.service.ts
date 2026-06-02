import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { TaskOutboxService } from '../task-outbox/task-outbox.service';
import { TaskEventsPublisher } from '../automations/events/task-events.publisher';
import { MoveTaskRepository, MoveTaskRow } from './move-task.repository';
import { autoMapStatuses, StatusLite } from './helpers/auto-map-status';
import { CustomFieldMoveAction, MoveToListDto } from './dtos/move-to-list.dto';
import {
  CustomFieldDiffItemDto,
  MovePreviewResponseDto,
} from './dtos/move-preview-response.dto';

@Injectable()
export class MoveTaskService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repository: MoveTaskRepository,
    @Inject(forwardRef(() => TaskOutboxService))
    private readonly outbox: TaskOutboxService,
    @Optional()
    private readonly automationEvents?: TaskEventsPublisher,
  ) {}

  async preview(
    workspaceId: string,
    taskIds: string[],
    targetListId: string,
  ): Promise<MovePreviewResponseDto> {
    const targetList = await this.repository.findTargetList(
      workspaceId,
      targetListId,
    );
    if (!targetList) {
      throw new NotFoundException('List de destino nao encontrada');
    }

    const { selectedCount, tasks: tasksToMove } = await this.loadTasksToMove(
      workspaceId,
      taskIds,
      targetListId,
    );
    if (selectedCount === 0) {
      throw new NotFoundException('Nenhuma task encontrada');
    }

    const targetChain = await this.repository.findStatusChainForList(
      workspaceId,
      targetList,
    );

    const { statusDiffs, needsReconciliation } = await this.buildStatusDiffs(
      tasksToMove,
      targetChain,
    );

    const customFieldDiffs = await this.buildCustomFieldDiffs(
      workspaceId,
      tasksToMove,
      {
        listId: targetList.id,
        folderId: targetList.folderId,
        spaceId: targetList.spaceId,
      },
    );

    return { needsReconciliation, statusDiffs, customFieldDiffs };
  }

  async moveToList(
    workspaceId: string,
    dto: MoveToListDto,
    actorId: string,
  ): Promise<{ moved: number }> {
    const targetList = await this.repository.findTargetList(
      workspaceId,
      dto.targetListId,
    );
    if (!targetList) {
      throw new NotFoundException('List de destino nao encontrada');
    }

    const { selectedCount, tasks: tasksToMove } = await this.loadTasksToMove(
      workspaceId,
      dto.taskIds,
      dto.targetListId,
    );
    if (selectedCount === 0) {
      throw new NotFoundException('Nenhuma task encontrada');
    }
    if (tasksToMove.length === 0) {
      return { moved: 0 };
    }

    const targetChain = await this.repository.findStatusChainForList(
      workspaceId,
      targetList,
    );
    const resolvedMap = await this.resolveStatusMapping(
      tasksToMove,
      targetChain,
      dto.statusMapping,
    );

    const clearDefIds = (dto.customFieldActions ?? [])
      .filter((a) => a.action === CustomFieldMoveAction.CLEAR)
      .map((a) => a.customFieldId);

    const moves = await this.executeMove(
      workspaceId,
      targetList,
      tasksToMove,
      resolvedMap,
      clearDefIds,
      actorId,
    );

    this.emitAutomationEvents(workspaceId, actorId, targetList.id, moves);

    return { moved: moves.length };
  }

  /**
   * Move usado por automacoes (sem humano pra reconciliar). Resolve o status de
   * destino por auto-map; sem equivalente de type cai no primeiro status do
   * destino (menor position). Nao re-emite automation events (evita cascata).
   */
  async moveToListAuto(
    workspaceId: string,
    taskId: string,
    targetListId: string,
    actorId: string | null,
  ): Promise<{ moved: number }> {
    const targetList = await this.repository.findTargetList(
      workspaceId,
      targetListId,
    );
    if (!targetList) return { moved: 0 };

    const { selectedCount, tasks: tasksToMove } = await this.loadTasksToMove(
      workspaceId,
      [taskId],
      targetListId,
    );
    if (selectedCount === 0 || tasksToMove.length === 0) {
      return { moved: 0 };
    }

    const targetChain = await this.repository.findStatusChainForList(
      workspaceId,
      targetList,
    );
    if (targetChain.length === 0) return { moved: 0 };

    const resolvedMap = await this.resolveStatusMappingAuto(
      tasksToMove,
      targetChain,
    );
    const moves = await this.executeMove(
      workspaceId,
      targetList,
      tasksToMove,
      resolvedMap,
      [],
      actorId,
    );
    return { moved: moves.length };
  }

  private async executeMove(
    workspaceId: string,
    targetList: { id: string; name: string },
    tasksToMove: MoveTaskRow[],
    resolvedMap: Map<string, string>,
    clearDefIds: string[],
    actorId: string | null,
  ): Promise<
    Array<{
      taskId: string;
      fromListId: string;
      fromStatusId: string;
      toStatusId: string;
    }>
  > {
    const sourceListIds = [...new Set(tasksToMove.map((t) => t.listId))];
    const listNames = await this.repository.findListNames([
      ...sourceListIds,
      targetList.id,
    ]);
    const toListName = listNames.get(targetList.id) ?? targetList.name;

    return this.prisma.$transaction(async (tx) => {
      const applied: Array<{
        taskId: string;
        fromListId: string;
        fromStatusId: string;
        toStatusId: string;
      }> = [];

      for (const task of tasksToMove) {
        const toStatusId = resolvedMap.get(task.statusId)!;
        await this.repository.applyMove(tx, task.id, targetList.id, toStatusId);

        await this.outbox.enqueue(tx, {
          aggregateId: task.id,
          eventType: 'MOVED_TO_LIST',
          payload: {
            actorId,
            workspaceId,
            fromListId: task.listId,
            fromListName: listNames.get(task.listId) ?? task.listId,
            toListId: targetList.id,
            toListName,
          },
          workspaceId,
        });

        if (toStatusId !== task.statusId) {
          await this.outbox.enqueue(tx, {
            aggregateId: task.id,
            eventType: 'STATUS_CHANGED',
            payload: {
              from: task.statusId,
              to: toStatusId,
              actorId,
              workspaceId,
              listId: targetList.id,
            },
            workspaceId,
          });
        }

        applied.push({
          taskId: task.id,
          fromListId: task.listId,
          fromStatusId: task.statusId,
          toStatusId,
        });
      }

      if (clearDefIds.length > 0) {
        await this.repository.clearCustomFieldValues(
          tx,
          tasksToMove.map((t) => t.id),
          clearDefIds,
        );
      }

      return applied;
    });
  }

  private async loadTasksToMove(
    workspaceId: string,
    taskIds: string[],
    targetListId: string,
  ): Promise<{ selectedCount: number; tasks: MoveTaskRow[] }> {
    const selected = await this.repository.findTasksInWorkspace(
      workspaceId,
      taskIds,
    );
    const subtasks = await this.repository.expandSubtasks(workspaceId, taskIds);

    const byId = new Map<string, MoveTaskRow>();
    for (const t of [...selected, ...subtasks]) byId.set(t.id, t);

    return {
      selectedCount: selected.length,
      tasks: [...byId.values()].filter((t) => t.listId !== targetListId),
    };
  }

  private async resolveStatusMappingAuto(
    tasksToMove: MoveTaskRow[],
    targetChain: StatusLite[],
  ): Promise<Map<string, string>> {
    const fallbackStatusId = targetChain[0].id;
    const sourceStatusIds = [...new Set(tasksToMove.map((t) => t.statusId))];
    const sourceStatuses =
      await this.repository.findStatusesByIds(sourceStatusIds);
    const auto = new Map(
      autoMapStatuses(sourceStatuses, targetChain).map((m) => [
        m.sourceStatusId,
        m.autoTargetStatusId,
      ]),
    );

    const resolved = new Map<string, string>();
    for (const sourceStatusId of sourceStatusIds) {
      resolved.set(
        sourceStatusId,
        auto.get(sourceStatusId) ?? fallbackStatusId,
      );
    }
    return resolved;
  }

  private async buildStatusDiffs(
    tasksToMove: MoveTaskRow[],
    targetChain: StatusLite[],
  ) {
    const countByStatus = new Map<string, number>();
    for (const t of tasksToMove) {
      countByStatus.set(t.statusId, (countByStatus.get(t.statusId) ?? 0) + 1);
    }
    const sourceStatuses = await this.repository.findStatusesByIds([
      ...countByStatus.keys(),
    ]);

    const mapped = autoMapStatuses(sourceStatuses, targetChain);
    const statusDiffs = mapped.map((m) => ({
      ...m,
      taskCount: countByStatus.get(m.sourceStatusId) ?? 0,
    }));
    const needsReconciliation = statusDiffs.some(
      (d) => d.autoTargetStatusId === null,
    );
    return { statusDiffs, needsReconciliation };
  }

  private async resolveStatusMapping(
    tasksToMove: MoveTaskRow[],
    targetChain: StatusLite[],
    manualMapping: MoveToListDto['statusMapping'],
  ): Promise<Map<string, string>> {
    const targetIds = new Set(targetChain.map((s) => s.id));
    const manual = new Map(
      manualMapping.map((m) => [m.sourceStatusId, m.targetStatusId]),
    );

    const sourceStatusIds = [...new Set(tasksToMove.map((t) => t.statusId))];
    const sourceStatuses =
      await this.repository.findStatusesByIds(sourceStatusIds);
    const auto = new Map(
      autoMapStatuses(sourceStatuses, targetChain).map((m) => [
        m.sourceStatusId,
        m.autoTargetStatusId,
      ]),
    );

    const resolved = new Map<string, string>();
    for (const sourceStatusId of sourceStatusIds) {
      const manualTarget = manual.get(sourceStatusId);
      if (manualTarget !== undefined) {
        if (!targetIds.has(manualTarget)) {
          throw new BadRequestException(
            `targetStatusId ${manualTarget} nao pertence a list de destino`,
          );
        }
        resolved.set(sourceStatusId, manualTarget);
        continue;
      }
      const autoTarget = auto.get(sourceStatusId) ?? null;
      if (!autoTarget) {
        throw new BadRequestException(
          `statusMapping ausente para o status ${sourceStatusId} (sem equivalente no destino)`,
        );
      }
      resolved.set(sourceStatusId, autoTarget);
    }
    return resolved;
  }

  private async buildCustomFieldDiffs(
    workspaceId: string,
    tasksToMove: MoveTaskRow[],
    targetHierarchy: {
      listId: string;
      folderId: string | null;
      spaceId: string | null;
    },
  ) {
    const taskIds = tasksToMove.map((t) => t.id);
    const sourceListIds = [...new Set(tasksToMove.map((t) => t.listId))];
    const hierarchies = await this.repository.findListHierarchies(
      workspaceId,
      sourceListIds,
    );

    const sourceDefs = new Map<string, string>();
    for (const listId of sourceListIds) {
      const hierarchy = hierarchies.get(listId);
      if (!hierarchy) continue;
      const defs = await this.repository.findApplicableCustomFields(
        workspaceId,
        hierarchy,
      );
      for (const d of defs) sourceDefs.set(d.id, d.name);
    }

    const targetDefsList = await this.repository.findApplicableCustomFields(
      workspaceId,
      targetHierarchy,
    );
    const targetDefs = new Map(targetDefsList.map((d) => [d.id, d.name]));

    const onlyInSourceIds = [...sourceDefs.keys()].filter(
      (id) => !targetDefs.has(id),
    );
    const valueCounts = await this.repository.countTasksWithValue(
      taskIds,
      onlyInSourceIds,
    );

    const onlyInSource: CustomFieldDiffItemDto[] = onlyInSourceIds.map(
      (id) => ({
        customFieldId: id,
        customFieldName: sourceDefs.get(id)!,
        taskCount: valueCounts.get(id) ?? 0,
      }),
    );
    const onlyInTarget: CustomFieldDiffItemDto[] = [...targetDefs.keys()]
      .filter((id) => !sourceDefs.has(id))
      .map((id) => ({
        customFieldId: id,
        customFieldName: targetDefs.get(id)!,
        taskCount: taskIds.length,
      }));
    const inBoth: CustomFieldDiffItemDto[] = [...sourceDefs.keys()]
      .filter((id) => targetDefs.has(id))
      .map((id) => ({
        customFieldId: id,
        customFieldName: sourceDefs.get(id)!,
        taskCount: taskIds.length,
      }));

    return { onlyInSource, onlyInTarget, inBoth };
  }

  private emitAutomationEvents(
    workspaceId: string,
    actorId: string,
    toListId: string,
    moves: Array<{
      taskId: string;
      fromListId: string;
      fromStatusId: string;
      toStatusId: string;
    }>,
  ): void {
    if (!this.automationEvents) return;
    for (const move of moves) {
      this.automationEvents.emitTaskMovedToList({
        workspaceId,
        taskId: move.taskId,
        listId: toListId,
        actorUserId: actorId,
        fromListId: move.fromListId,
        toListId,
      });
      if (move.toStatusId !== move.fromStatusId) {
        this.automationEvents.emitTaskStatusChanged({
          workspaceId,
          taskId: move.taskId,
          listId: toListId,
          actorUserId: actorId,
          before: move.fromStatusId,
          after: move.toStatusId,
        });
      }
    }
  }
}
