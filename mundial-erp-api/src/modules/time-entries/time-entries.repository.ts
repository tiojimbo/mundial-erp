import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

const TIME_ENTRY_SELECT = {
  id: true,
  workItemId: true,
  userId: true,
  startTime: true,
  endTime: true,
  durationSeconds: true,
  description: true,
  createdAt: true,
  updatedAt: true,
} as const;

export interface CreateTimeEntryData {
  workItemId: string;
  userId: string;
  startTime: Date;
  endTime?: Date | null;
  durationSeconds?: number | null;
  description?: string | null;
}

@Injectable()
export class TimeEntriesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findTaskInWorkspace(workspaceId: string, taskId: string) {
    return this.prisma.workItem.findFirst({
      where: {
        id: taskId,
        deletedAt: null,
        list: { space: { workspaceId } },
      },
      select: { id: true },
    });
  }

  async findByTask(workspaceId: string, taskId: string) {
    return this.prisma.workItemTimeEntry.findMany({
      where: {
        workItemId: taskId,
        deletedAt: null,
        workItem: { list: { space: { workspaceId } } },
      },
      orderBy: { startTime: 'desc' },
      select: TIME_ENTRY_SELECT,
    });
  }

  async findActiveForUser(taskId: string, userId: string) {
    return this.prisma.workItemTimeEntry.findFirst({
      where: {
        workItemId: taskId,
        userId,
        endTime: null,
        deletedAt: null,
      },
      select: TIME_ENTRY_SELECT,
    });
  }

  async findById(workspaceId: string, entryId: string) {
    return this.prisma.workItemTimeEntry.findFirst({
      where: {
        id: entryId,
        deletedAt: null,
        workItem: { list: { space: { workspaceId } } },
      },
      select: TIME_ENTRY_SELECT,
    });
  }

  async create(data: CreateTimeEntryData) {
    return this.prisma.workItemTimeEntry.create({
      data: {
        workItemId: data.workItemId,
        userId: data.userId,
        startTime: data.startTime,
        endTime: data.endTime ?? null,
        durationSeconds: data.durationSeconds ?? null,
        description: data.description ?? null,
      },
      select: TIME_ENTRY_SELECT,
    });
  }

  async stop(
    entryId: string,
    endTime: Date,
    durationSeconds: number,
    tx?: Prisma.TransactionClient,
  ) {
    const db = tx ?? this.prisma;
    return db.workItemTimeEntry.update({
      where: { id: entryId },
      data: { endTime, durationSeconds },
      select: TIME_ENTRY_SELECT,
    });
  }
}
