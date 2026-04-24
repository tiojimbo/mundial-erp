/**
 * TaskChecklistsService
 *
 * Regras (PLANO-TASKS.md §7.3, §8.9-8.12):
 *   - Cross-tenant => 404 silencioso.
 *   - Reorder executa em `$transaction` unica (delegado ao repository).
 *   - `parentId` do item precisa pertencer a MESMA checklist.
 *   - Resolver item: set resolvedAt=now, resolvedBy=userId + emit
 *     CHECKLIST_ITEM_RESOLVED via outbox.
 *   - Criar primeiro item de uma checklist recem-criada emite CHECKLIST_CREATED
 *     (PLANO §7.3 "enqueue CHECKLIST_CREATED no primeiro item").
 *   - Nunca grava direto em WorkItemActivity (ADR-002).
 */
import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { TaskChecklistsRepository } from './task-checklists.repository';
import { CreateChecklistDto } from './dtos/create-checklist.dto';
import { UpdateChecklistDto } from './dtos/update-checklist.dto';
import { CreateChecklistItemDto } from './dtos/create-checklist-item.dto';
import { UpdateChecklistItemDto } from './dtos/update-checklist-item.dto';
import { ReorderChecklistItemsDto } from './dtos/reorder-checklist-items.dto';
import {
  ChecklistItemResponseDto,
  ChecklistResponseDto,
  type ChecklistItemShape,
  type ChecklistShape,
} from './dtos/checklist-response.dto';
import { TaskOutboxService } from '../task-outbox/task-outbox.service';

const OUTBOX_CHECKLIST_CREATED = 'CHECKLIST_CREATED' as const;
const OUTBOX_CHECKLIST_ITEM_RESOLVED = 'CHECKLIST_ITEM_RESOLVED' as const;

@Injectable()
export class TaskChecklistsService {
  private readonly logger = new Logger(TaskChecklistsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly repository: TaskChecklistsRepository,
    @Inject(forwardRef(() => TaskOutboxService))
    private readonly outbox: TaskOutboxService,
  ) {}

  // ---------------------------------------------------------------------------
  // Checklists
  // ---------------------------------------------------------------------------

  async findByTask(
    workspaceId: string,
    taskId: string,
  ): Promise<ChecklistResponseDto[]> {
    const task = await this.repository.findWorkItemForWorkspace(
      workspaceId,
      taskId,
    );
    if (!task) {
      throw new NotFoundException('Tarefa nao encontrada');
    }
    const rows = await this.repository.findChecklistsByWorkItem(
      workspaceId,
      taskId,
    );
    return rows.map((r) =>
      ChecklistResponseDto.fromEntity(r as unknown as ChecklistShape),
    );
  }

  async createChecklist(
    workspaceId: string,
    taskId: string,
    dto: CreateChecklistDto,
  ): Promise<ChecklistResponseDto> {
    const task = await this.repository.findWorkItemForWorkspace(
      workspaceId,
      taskId,
    );
    if (!task) {
      throw new NotFoundException('Tarefa nao encontrada');
    }

    const position =
      dto.position ??
      (await this.repository.findMaxChecklistPosition(taskId)) + 1;

    const created = await this.repository.createChecklist({
      workItemId: taskId,
      name: dto.name.trim(),
      position,
    });

    return ChecklistResponseDto.fromEntity(created as unknown as ChecklistShape);
  }

  async updateChecklist(
    workspaceId: string,
    id: string,
    dto: UpdateChecklistDto,
  ): Promise<ChecklistResponseDto> {
    const existing = await this.repository.findChecklistById(workspaceId, id);
    if (!existing) {
      throw new NotFoundException('Checklist nao encontrada');
    }

    const data: { name?: string; position?: number } = {};
    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.position !== undefined) data.position = dto.position;

    const updated = await this.repository.updateChecklist(id, data);
    return ChecklistResponseDto.fromEntity(updated as unknown as ChecklistShape);
  }

  async removeChecklist(workspaceId: string, id: string): Promise<void> {
    const existing = await this.repository.findChecklistById(workspaceId, id);
    if (!existing) {
      throw new NotFoundException('Checklist nao encontrada');
    }
    await this.repository.softDeleteChecklist(id);
  }

  // ---------------------------------------------------------------------------
  // Items
  // ---------------------------------------------------------------------------

  async createItem(
    workspaceId: string,
    checklistId: string,
    dto: CreateChecklistItemDto,
    actorUserId: string,
  ): Promise<ChecklistItemResponseDto> {
    const checklist = await this.repository.findChecklistByIdWithItems(
      workspaceId,
      checklistId,
    );
    if (!checklist) {
      throw new NotFoundException('Checklist nao encontrada');
    }

    // Valida parentId na mesma checklist.
    if (dto.parentId) {
      const parentExists = await this.repository.findItemsByIds(checklistId, [
        dto.parentId,
      ]);
      if (parentExists.length !== 1) {
        throw new BadRequestException(
          'parentId nao pertence a esta checklist',
        );
      }
    }

    const position =
      dto.position ??
      (await this.repository.findMaxItemPosition(checklistId)) + 1;

    const itemsBefore = (checklist as unknown as ChecklistShape).items ?? [];
    const isFirstItem = itemsBefore.length === 0;
    const parentWorkItemId = (checklist as unknown as ChecklistShape).workItemId;
    const parentChecklistName = (checklist as unknown as ChecklistShape).name;

    const created = await this.prisma.$transaction(async (tx) => {
      const row = await this.repository.createItem(
        {
          checklistId,
          name: dto.name.trim(),
          parentId: dto.parentId ?? null,
          assigneeId: dto.assigneeId ?? null,
          position,
          resolved: dto.resolved ?? false,
          resolvedAt: dto.resolved ? new Date() : null,
          resolvedBy: dto.resolved ? actorUserId : null,
        },
        tx,
      );
      if (isFirstItem) {
        // Primeiro item da checklist recem-criada => emite CHECKLIST_CREATED.
        await this.outbox.enqueue(tx, {
          aggregateId: parentWorkItemId,
          eventType: OUTBOX_CHECKLIST_CREATED,
          payload: {
            taskId: parentWorkItemId,
            checklistId,
            checklistName: parentChecklistName,
            actorId: actorUserId,
          },
          workspaceId,
        });
      }
      return row;
    });

    return ChecklistItemResponseDto.fromEntity(
      created as unknown as ChecklistItemShape,
    );
  }

  async updateItem(
    workspaceId: string,
    checklistId: string,
    itemId: string,
    dto: UpdateChecklistItemDto,
    actorUserId: string,
  ): Promise<ChecklistItemResponseDto> {
    const item = await this.repository.findItemById(workspaceId, itemId);
    if (!item || item.checklist.id !== checklistId) {
      throw new NotFoundException('Item de checklist nao encontrado');
    }

    if (dto.parentId !== undefined && dto.parentId !== null) {
      if (dto.parentId === itemId) {
        throw new BadRequestException('Item nao pode ser seu proprio pai');
      }
      const parentExists = await this.repository.findItemsByIds(checklistId, [
        dto.parentId,
      ]);
      if (parentExists.length !== 1) {
        throw new BadRequestException(
          'parentId nao pertence a esta checklist',
        );
      }
    }

    const data: {
      name?: string;
      parentId?: string | null;
      assigneeId?: string | null;
      position?: number;
      resolved?: boolean;
      resolvedAt?: Date | null;
      resolvedBy?: string | null;
    } = {};

    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.parentId !== undefined) data.parentId = dto.parentId;
    if (dto.assigneeId !== undefined) data.assigneeId = dto.assigneeId;
    if (dto.position !== undefined) data.position = dto.position;

    const wasResolved = item.resolved;
    const willResolve = dto.resolved === true && !wasResolved;
    const willUnresolve = dto.resolved === false && wasResolved;

    if (willResolve) {
      data.resolved = true;
      data.resolvedAt = new Date();
      data.resolvedBy = actorUserId;
    } else if (willUnresolve) {
      data.resolved = false;
      data.resolvedAt = null;
      data.resolvedBy = null;
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const row = await this.repository.updateItem(itemId, data, tx);
      if (willResolve) {
        await this.outbox.enqueue(tx, {
          aggregateId: item.checklist.workItemId,
          eventType: OUTBOX_CHECKLIST_ITEM_RESOLVED,
          payload: {
            taskId: item.checklist.workItemId,
            checklistId,
            itemId,
            itemName: row.name,
            actorId: actorUserId,
          },
          workspaceId,
        });
      }
      return row;
    });

    return ChecklistItemResponseDto.fromEntity(
      updated as unknown as ChecklistItemShape,
    );
  }

  async removeItem(
    workspaceId: string,
    checklistId: string,
    itemId: string,
  ): Promise<void> {
    const item = await this.repository.findItemById(workspaceId, itemId);
    if (!item || item.checklist.id !== checklistId) {
      throw new NotFoundException('Item de checklist nao encontrado');
    }
    await this.repository.softDeleteItem(itemId);
  }

  async reorderItems(
    workspaceId: string,
    checklistId: string,
    dto: ReorderChecklistItemsDto,
  ): Promise<void> {
    const checklist = await this.repository.findChecklistById(
      workspaceId,
      checklistId,
    );
    if (!checklist) {
      throw new NotFoundException('Checklist nao encontrada');
    }

    const ids = dto.items.map((it) => it.id);
    if (new Set(ids).size !== ids.length) {
      throw new BadRequestException('ids duplicados em reorder');
    }

    const found = await this.repository.findItemsByIds(checklistId, ids);
    if (found.length !== ids.length) {
      throw new BadRequestException(
        'Um ou mais ids nao pertencem a esta checklist',
      );
    }

    await this.repository.bulkUpdateItemPositions(
      dto.items.map((it) => ({ id: it.id, position: it.position })),
    );
  }
}
