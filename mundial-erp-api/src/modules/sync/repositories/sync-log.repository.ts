// SCOPE: GLOBAL — vide sync-mapping.repository.ts.

import { Injectable } from '@nestjs/common';
import { Prisma, SyncEntity, SyncStatus } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';

@Injectable()
export class SyncLogRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(entity: SyncEntity) {
    return this.prisma.syncLog.create({
      data: { entity, status: SyncStatus.PENDING },
    });
  }

  async markInProgress(id: string, totalRecords: number) {
    return this.prisma.syncLog.update({
      where: { id },
      data: {
        status: SyncStatus.IN_PROGRESS,
        startedAt: new Date(),
        totalRecords,
      },
    });
  }

  async incrementSynced(id: string) {
    return this.prisma.syncLog.update({
      where: { id },
      data: { syncedRecords: { increment: 1 } },
    });
  }

  async incrementFailed(id: string) {
    return this.prisma.syncLog.update({
      where: { id },
      data: { failedRecords: { increment: 1 } },
    });
  }

  async markSuccess(id: string) {
    return this.prisma.syncLog.update({
      where: { id },
      data: { status: SyncStatus.SUCCESS, completedAt: new Date() },
    });
  }

  async markFailed(id: string, errorMessage: string) {
    return this.prisma.syncLog.update({
      where: { id },
      data: {
        status: SyncStatus.FAILED,
        completedAt: new Date(),
        errorMessage,
      },
    });
  }

  async findMany(params: {
    skip?: number;
    take?: number;
    entity?: SyncEntity;
  }) {
    const { skip = 0, take = 20, entity } = params;
    const where: Prisma.SyncLogWhereInput = entity ? { entity } : {};

    const [items, total] = await Promise.all([
      this.prisma.syncLog.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.syncLog.count({ where }),
    ]);

    return { items, total };
  }

  async findById(id: string) {
    return this.prisma.syncLog.findUnique({ where: { id } });
  }

  async getLatestByEntity(entity: SyncEntity) {
    return this.prisma.syncLog.findFirst({
      where: { entity },
      orderBy: { createdAt: 'desc' },
    });
  }
}
