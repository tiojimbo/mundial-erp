import { Injectable } from '@nestjs/common';
import { AuditAction, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class AuditLogRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    userId?: string;
    action: AuditAction;
    entity: string;
    entityId: string;
    changes?: Record<string, unknown>;
    ipAddress?: string;
    userAgent?: string;
  }) {
    return this.prisma.auditLog.create({
      data: {
        ...(data.userId && { user: { connect: { id: data.userId } } }),
        action: data.action,
        entity: data.entity,
        entityId: data.entityId,
        changes: data.changes as Prisma.InputJsonValue,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
      },
    });
  }

  async findMany(params: {
    skip?: number;
    take?: number;
    entity?: string;
    entityId?: string;
    userId?: string;
    action?: AuditAction;
    dateFrom?: Date;
    dateTo?: Date;
  }) {
    const {
      skip = 0,
      take = 20,
      entity,
      entityId,
      userId,
      action,
      dateFrom,
      dateTo,
    } = params;

    const where: Prisma.AuditLogWhereInput = {
      ...(entity && { entity }),
      ...(entityId && { entityId }),
      ...(userId && { userId }),
      ...(action && { action }),
      ...((dateFrom || dateTo) && {
        createdAt: {
          ...(dateFrom && { gte: dateFrom }),
          ...(dateTo && { lte: dateTo }),
        },
      }),
    };

    const [items, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          action: true,
          entity: true,
          entityId: true,
          changes: true,
          ipAddress: true,
          createdAt: true,
          user: { select: { id: true, name: true } },
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { items, total };
  }

  async findByEntity(entity: string, entityId: string) {
    return this.prisma.auditLog.findMany({
      where: { entity, entityId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        action: true,
        changes: true,
        ipAddress: true,
        createdAt: true,
        user: { select: { id: true, name: true } },
      },
    });
  }
}
