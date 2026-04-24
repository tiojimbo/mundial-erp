/**
 * Repositorio de WorkItemChecklist + WorkItemChecklistItem.
 *
 * Escopo multi-tenant: WorkItemChecklist nao tem workspaceId direto — filtrar
 * via workItem.process.department.workspaceId. Cross-tenant -> 404 (service).
 *
 * Soft delete obrigatorio (PLANO-TASKS.md §8.5). Writes em listagens usam
 * `select` explicito (CTO note #4).
 */

import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

const CHECKLIST_SELECT = {
  id: true,
  workItemId: true,
  name: true,
  position: true,
  createdAt: true,
  updatedAt: true,
} as const;

const CHECKLIST_ITEM_SELECT = {
  id: true,
  checklistId: true,
  parentId: true,
  name: true,
  assigneeId: true,
  resolved: true,
  resolvedAt: true,
  resolvedBy: true,
  position: true,
  source: true,
  createdAt: true,
  updatedAt: true,
} as const;

export interface ChecklistCreateInput {
  workItemId: string;
  name: string;
  position: number;
}

export interface ChecklistItemCreateInput {
  checklistId: string;
  name: string;
  parentId?: string | null;
  assigneeId?: string | null;
  position: number;
  resolved?: boolean;
  resolvedAt?: Date | null;
  resolvedBy?: string | null;
}

@Injectable()
export class TaskChecklistsRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Resolve o workItem filtrando pelo workspace — base para todo cross-tenant check. */
  async findWorkItemForWorkspace(workspaceId: string, workItemId: string) {
    return this.prisma.workItem.findFirst({
      where: {
        id: workItemId,
        deletedAt: null,
        process: { department: { workspaceId } },
      },
      select: { id: true },
    });
  }

  async findChecklistsByWorkItem(workspaceId: string, workItemId: string) {
    return this.prisma.workItemChecklist.findMany({
      where: {
        workItemId,
        deletedAt: null,
        workItem: { process: { department: { workspaceId } } },
      },
      orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
      select: {
        ...CHECKLIST_SELECT,
        items: {
          where: { deletedAt: null },
          orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
          select: CHECKLIST_ITEM_SELECT,
        },
      },
    });
  }

  async findChecklistById(workspaceId: string, id: string) {
    return this.prisma.workItemChecklist.findFirst({
      where: {
        id,
        deletedAt: null,
        workItem: { process: { department: { workspaceId } } },
      },
      select: {
        ...CHECKLIST_SELECT,
        workItem: { select: { id: true } },
      },
    });
  }

  async findChecklistByIdWithItems(workspaceId: string, id: string) {
    return this.prisma.workItemChecklist.findFirst({
      where: {
        id,
        deletedAt: null,
        workItem: { process: { department: { workspaceId } } },
      },
      select: {
        ...CHECKLIST_SELECT,
        items: {
          where: { deletedAt: null },
          orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
          select: CHECKLIST_ITEM_SELECT,
        },
      },
    });
  }

  async findMaxChecklistPosition(workItemId: string): Promise<number> {
    const row = await this.prisma.workItemChecklist.findFirst({
      where: { workItemId, deletedAt: null },
      orderBy: { position: 'desc' },
      select: { position: true },
    });
    return row?.position ?? -1;
  }

  async createChecklist(input: ChecklistCreateInput) {
    return this.prisma.workItemChecklist.create({
      data: {
        workItemId: input.workItemId,
        name: input.name,
        position: input.position,
      },
      select: CHECKLIST_SELECT,
    });
  }

  async updateChecklist(
    id: string,
    data: Prisma.WorkItemChecklistUncheckedUpdateInput,
  ) {
    return this.prisma.workItemChecklist.update({
      where: { id },
      data,
      select: CHECKLIST_SELECT,
    });
  }

  async softDeleteChecklist(id: string) {
    await this.prisma.$transaction([
      this.prisma.workItemChecklistItem.updateMany({
        where: { checklistId: id, deletedAt: null },
        data: { deletedAt: new Date() },
      }),
      this.prisma.workItemChecklist.update({
        where: { id },
        data: { deletedAt: new Date() },
      }),
    ]);
  }

  /** Valida que todos os ids pertencem a mesma checklist e nao deletados. */
  async findItemsByIds(checklistId: string, ids: string[]) {
    return this.prisma.workItemChecklistItem.findMany({
      where: {
        id: { in: ids },
        checklistId,
        deletedAt: null,
      },
      select: { id: true },
    });
  }

  async findItemById(workspaceId: string, itemId: string) {
    return this.prisma.workItemChecklistItem.findFirst({
      where: {
        id: itemId,
        deletedAt: null,
        checklist: {
          deletedAt: null,
          workItem: { process: { department: { workspaceId } } },
        },
      },
      select: {
        ...CHECKLIST_ITEM_SELECT,
        checklist: { select: { id: true, workItemId: true } },
      },
    });
  }

  async findMaxItemPosition(checklistId: string): Promise<number> {
    const row = await this.prisma.workItemChecklistItem.findFirst({
      where: { checklistId, deletedAt: null },
      orderBy: { position: 'desc' },
      select: { position: true },
    });
    return row?.position ?? -1;
  }

  async createItem(
    input: ChecklistItemCreateInput,
    tx?: Prisma.TransactionClient,
  ) {
    const db = tx ?? this.prisma;
    return db.workItemChecklistItem.create({
      data: {
        checklistId: input.checklistId,
        name: input.name,
        parentId: input.parentId ?? null,
        assigneeId: input.assigneeId ?? null,
        position: input.position,
        resolved: input.resolved ?? false,
        resolvedAt: input.resolvedAt ?? null,
        resolvedBy: input.resolvedBy ?? null,
      },
      select: CHECKLIST_ITEM_SELECT,
    });
  }

  async updateItem(
    id: string,
    data: Prisma.WorkItemChecklistItemUncheckedUpdateInput,
    tx?: Prisma.TransactionClient,
  ) {
    const db = tx ?? this.prisma;
    return db.workItemChecklistItem.update({
      where: { id },
      data,
      select: CHECKLIST_ITEM_SELECT,
    });
  }

  async softDeleteItem(id: string) {
    await this.prisma.workItemChecklistItem.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  /**
   * Reorder em transacao unica (PLANO-TASKS.md §7.3).
   * Valida cardinalidade + escopo no service; aqui executa update em lote.
   */
  async bulkUpdateItemPositions(
    items: Array<{ id: string; position: number }>,
  ): Promise<void> {
    if (items.length === 0) return;
    await this.prisma.$transaction(
      items.map((it) =>
        this.prisma.workItemChecklistItem.update({
          where: { id: it.id },
          data: { position: it.position },
        }),
      ),
    );
  }
}
