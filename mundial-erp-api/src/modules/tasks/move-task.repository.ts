import { Injectable } from '@nestjs/common';
import { Prisma, StatusInheritance } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { StatusLite } from './helpers/auto-map-status';

export interface MoveTaskRow {
  id: string;
  listId: string;
  statusId: string;
  parentId: string | null;
}

interface ListForStatusScope {
  spaceId: string | null;
  folderId: string | null;
  statusInheritance: StatusInheritance;
  folder: {
    spaceId: string | null;
    statusInheritance: StatusInheritance;
  } | null;
}

const SUBTASK_EXPANSION_CAP = 1000;

@Injectable()
export class MoveTaskRepository {
  constructor(private readonly prisma: PrismaService) {}

  private client(tx?: Prisma.TransactionClient) {
    return tx ?? this.prisma;
  }

  async findTargetList(workspaceId: string, listId: string) {
    return this.prisma.list.findFirst({
      where: {
        id: listId,
        deletedAt: null,
        OR: [
          { space: { workspaceId } },
          { folder: { space: { workspaceId } } },
        ],
      },
      select: {
        id: true,
        name: true,
        spaceId: true,
        folderId: true,
        statusInheritance: true,
        folder: { select: { spaceId: true, statusInheritance: true } },
      },
    });
  }

  /** Tasks (id, listId, statusId, parentId) que pertencem ao workspace. */
  async findTasksInWorkspace(
    workspaceId: string,
    taskIds: string[],
  ): Promise<MoveTaskRow[]> {
    if (taskIds.length === 0) return [];
    return this.prisma.workItem.findMany({
      where: {
        id: { in: taskIds },
        deletedAt: null,
        list: {
          OR: [
            { space: { workspaceId } },
            { folder: { space: { workspaceId } } },
          ],
        },
      },
      select: { id: true, listId: true, statusId: true, parentId: true },
    });
  }

  /** BFS por parentId: retorna todos os descendentes ativos dos `rootIds`. */
  async expandSubtasks(
    workspaceId: string,
    rootIds: string[],
  ): Promise<MoveTaskRow[]> {
    const collected = new Map<string, MoveTaskRow>();
    const seenParents = new Set<string>();
    let frontier = [...rootIds];

    while (frontier.length > 0 && collected.size < SUBTASK_EXPANSION_CAP) {
      const pending = frontier.filter((id) => !seenParents.has(id));
      pending.forEach((id) => seenParents.add(id));
      if (pending.length === 0) break;

      const children = await this.prisma.workItem.findMany({
        where: {
          parentId: { in: pending },
          deletedAt: null,
          list: {
            OR: [
              { space: { workspaceId } },
              { folder: { space: { workspaceId } } },
            ],
          },
        },
        select: { id: true, listId: true, statusId: true, parentId: true },
      });

      frontier = [];
      for (const child of children) {
        if (collected.has(child.id)) continue;
        collected.set(child.id, child);
        frontier.push(child.id);
      }
    }

    return [...collected.values()];
  }

  async findStatusesByIds(ids: string[]): Promise<StatusLite[]> {
    if (ids.length === 0) return [];
    return this.prisma.status.findMany({
      where: { id: { in: ids }, deletedAt: null },
      select: { id: true, name: true, type: true, position: true },
    });
  }

  /** Esteira de status efetiva da list, resolvendo a heranca SPACE/FOLDER/CUSTOM. */
  async findStatusChainForList(
    workspaceId: string,
    list: ListForStatusScope,
  ): Promise<StatusLite[]> {
    const scope = this.resolveListStatusScope(list);
    return this.prisma.status.findMany({
      where: {
        ...scope,
        deletedAt: null,
        OR: [
          { space: { workspaceId } },
          { folder: { space: { workspaceId } } },
          {
            list: {
              OR: [
                { space: { workspaceId } },
                { folder: { space: { workspaceId } } },
              ],
            },
          },
        ],
      },
      select: { id: true, name: true, type: true, position: true },
      orderBy: { position: 'asc' },
    });
  }

  private resolveListStatusScope(
    list: ListForStatusScope & { id?: string },
  ): Prisma.StatusWhereInput {
    if (list.statusInheritance === 'CUSTOM') {
      return { listId: list.id };
    }
    if (list.statusInheritance === 'SPACE') {
      return { spaceId: list.spaceId, folderId: null, listId: null };
    }
    const folder = list.folder;
    if (folder && folder.statusInheritance === 'CUSTOM' && list.folderId) {
      return { folderId: list.folderId, listId: null };
    }
    const spaceId = folder?.spaceId ?? list.spaceId;
    return { spaceId, folderId: null, listId: null };
  }

  async findListHierarchies(
    workspaceId: string,
    listIds: string[],
  ): Promise<
    Map<
      string,
      { listId: string; folderId: string | null; spaceId: string | null }
    >
  > {
    const map = new Map<
      string,
      { listId: string; folderId: string | null; spaceId: string | null }
    >();
    if (listIds.length === 0) return map;
    const rows = await this.prisma.list.findMany({
      where: {
        id: { in: listIds },
        OR: [
          { space: { workspaceId } },
          { folder: { space: { workspaceId } } },
        ],
      },
      select: {
        id: true,
        folderId: true,
        spaceId: true,
        folder: { select: { spaceId: true } },
      },
    });
    for (const r of rows) {
      map.set(r.id, {
        listId: r.id,
        folderId: r.folderId,
        spaceId: r.spaceId ?? r.folder?.spaceId ?? null,
      });
    }
    return map;
  }

  async findListNames(listIds: string[]): Promise<Map<string, string>> {
    const map = new Map<string, string>();
    if (listIds.length === 0) return map;
    const rows = await this.prisma.list.findMany({
      where: { id: { in: listIds } },
      select: { id: true, name: true },
    });
    for (const r of rows) map.set(r.id, r.name);
    return map;
  }

  /**
   * Custom fields aplicaveis a uma list, considerando escopo direto
   * (listId/folderId/spaceId na definicao) e via tabelas de link.
   */
  async findApplicableCustomFields(
    workspaceId: string,
    hierarchy: {
      listId: string;
      folderId: string | null;
      spaceId: string | null;
    },
  ): Promise<Array<{ id: string; name: string }>> {
    const directOr: Prisma.CustomFieldDefinitionWhereInput[] = [
      { listId: hierarchy.listId },
    ];
    if (hierarchy.folderId) directOr.push({ folderId: hierarchy.folderId });
    if (hierarchy.spaceId) directOr.push({ spaceId: hierarchy.spaceId });

    const [direct, listLinks, folderLinks, spaceLinks] = await Promise.all([
      this.prisma.customFieldDefinition.findMany({
        where: { deletedAt: null, workspaceId, OR: directOr },
        select: { id: true, label: true, name: true },
      }),
      this.prisma.customFieldList.findMany({
        where: { listId: hierarchy.listId },
        select: { customFieldId: true },
      }),
      hierarchy.folderId
        ? this.prisma.customFieldFolder.findMany({
            where: { folderId: hierarchy.folderId },
            select: { customFieldId: true },
          })
        : Promise.resolve([]),
      hierarchy.spaceId
        ? this.prisma.customFieldSpace.findMany({
            where: { spaceId: hierarchy.spaceId },
            select: { customFieldId: true },
          })
        : Promise.resolve([]),
    ]);

    const linkedIds = new Set<string>([
      ...listLinks.map((l) => l.customFieldId),
      ...folderLinks.map((l) => l.customFieldId),
      ...spaceLinks.map((l) => l.customFieldId),
    ]);
    const linked =
      linkedIds.size > 0
        ? await this.prisma.customFieldDefinition.findMany({
            where: { id: { in: [...linkedIds] }, deletedAt: null, workspaceId },
            select: { id: true, label: true, name: true },
          })
        : [];

    const byId = new Map<string, { id: string; name: string }>();
    for (const def of [...direct, ...linked]) {
      byId.set(def.id, { id: def.id, name: def.label ?? def.name });
    }
    return [...byId.values()];
  }

  /** Quantas das tasks tem valor preenchido para cada definicao. */
  async countTasksWithValue(
    taskIds: string[],
    definitionIds: string[],
  ): Promise<Map<string, number>> {
    const map = new Map<string, number>();
    if (taskIds.length === 0 || definitionIds.length === 0) return map;
    const rows = await this.prisma.customFieldValue.groupBy({
      by: ['definitionId'],
      where: {
        workItemId: { in: taskIds },
        definitionId: { in: definitionIds },
      },
      _count: { _all: true },
    });
    for (const r of rows) map.set(r.definitionId, r._count._all);
    return map;
  }

  async applyMove(
    tx: Prisma.TransactionClient,
    taskId: string,
    listId: string,
    statusId: string,
  ): Promise<void> {
    await tx.workItem.update({
      where: { id: taskId },
      data: { listId, statusId },
      select: { id: true },
    });
  }

  async clearCustomFieldValues(
    tx: Prisma.TransactionClient,
    taskIds: string[],
    definitionIds: string[],
  ): Promise<void> {
    if (taskIds.length === 0 || definitionIds.length === 0) return;
    await tx.customFieldValue.deleteMany({
      where: {
        workItemId: { in: taskIds },
        definitionId: { in: definitionIds },
      },
    });
  }
}
