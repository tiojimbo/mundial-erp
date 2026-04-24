import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

/**
 * Repositorio de `WorkItemWatcher`.
 *
 * Nota: o model `workItemWatcher` e criado pela Migration 2
 * (`tasks_collaboration`). Erros de compilacao aqui sao esperados ate a
 * migration ser aplicada e `prisma generate` rodar.
 */

const WATCHER_USER_SELECT = {
  id: true,
  name: true,
  email: true,
} as const;

const WATCHER_SELECT = {
  workItemId: true,
  userId: true,
  addedAt: true,
  user: { select: WATCHER_USER_SELECT },
} as const;

@Injectable()
export class TaskWatchersRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Valida que o `taskId` pertence ao workspace via
   * `process.department.workspaceId`. Retorna apenas o id — se vier null,
   * controller deve responder 404 (nao vaza existencia).
   */
  async findTaskInWorkspace(workspaceId: string, taskId: string) {
    return this.prisma.workItem.findFirst({
      where: {
        id: taskId,
        deletedAt: null,
        process: { department: { workspaceId } },
      },
      select: { id: true },
    });
  }

  /**
   * Valida que o `userId` e membro do workspace. Retorna apenas o id.
   */
  async findMemberInWorkspace(workspaceId: string, userId: string) {
    return this.prisma.workspaceMember.findFirst({
      where: { workspaceId, userId },
      select: { userId: true },
    });
  }

  async findByTask(taskId: string) {
    return this.prisma.workItemWatcher.findMany({
      where: { workItemId: taskId },
      orderBy: { addedAt: 'asc' },
      select: WATCHER_SELECT,
    });
  }

  async findOne(taskId: string, userId: string) {
    return this.prisma.workItemWatcher.findUnique({
      where: { workItemId_userId: { workItemId: taskId, userId } },
      select: WATCHER_SELECT,
    });
  }

  async add(taskId: string, userId: string, tx?: Prisma.TransactionClient) {
    const db = tx ?? this.prisma;
    return db.workItemWatcher.create({
      data: { workItemId: taskId, userId },
      select: WATCHER_SELECT,
    });
  }

  async remove(taskId: string, userId: string, tx?: Prisma.TransactionClient) {
    const db = tx ?? this.prisma;
    return db.workItemWatcher.delete({
      where: { workItemId_userId: { workItemId: taskId, userId } },
      select: { workItemId: true, userId: true },
    });
  }
}
