import { Injectable } from '@nestjs/common';
import {
  Automation,
  AutomationScopeType,
  AutomationTrigger,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

export const AUTOMATION_SELECT = {
  id: true,
  workspaceId: true,
  createdById: true,
  name: true,
  description: true,
  trigger: true,
  scopeType: true,
  scopeId: true,
  compiledActions: true,
  conditions: true,
  isActive: true,
  executionCount: true,
  lastExecutedAt: true,
  cronExpression: true,
  timezone: true,
  nextRunAt: true,
  createdAt: true,
  updatedAt: true,
} as const;

export interface ListFilters {
  trigger?: AutomationTrigger;
  scopeType?: AutomationScopeType;
  scopeId?: string;
  isActive?: boolean;
}

export interface CreateAutomationData {
  workspaceId: string;
  createdById: string;
  name: string;
  description?: string | null;
  trigger: AutomationTrigger;
  scopeType: AutomationScopeType;
  scopeId?: string | null;
  compiledActions: Prisma.InputJsonValue;
  conditions: Prisma.InputJsonValue;
  isActive?: boolean;
  cronExpression?: string | null;
  timezone?: string | null;
  nextRunAt?: Date | null;
}

export interface UpdateAutomationData {
  name?: string;
  description?: string | null;
  trigger?: AutomationTrigger;
  scopeType?: AutomationScopeType;
  scopeId?: string | null;
  compiledActions?: Prisma.InputJsonValue;
  conditions?: Prisma.InputJsonValue;
  isActive?: boolean;
  cronExpression?: string | null;
  timezone?: string | null;
  nextRunAt?: Date | null;
}

@Injectable()
export class AutomationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  list(workspaceId: string, filters: ListFilters = {}) {
    return this.prisma.automation.findMany({
      where: {
        workspaceId,
        deletedAt: null,
        ...(filters.trigger && { trigger: filters.trigger }),
        ...(filters.scopeType && { scopeType: filters.scopeType }),
        ...(filters.scopeId !== undefined && { scopeId: filters.scopeId }),
        ...(filters.isActive !== undefined && { isActive: filters.isActive }),
      },
      orderBy: { createdAt: 'desc' },
      select: AUTOMATION_SELECT,
    });
  }

  findById(workspaceId: string, id: string) {
    return this.prisma.automation.findFirst({
      where: { id, workspaceId, deletedAt: null },
      select: AUTOMATION_SELECT,
    });
  }

  findActiveByTrigger(
    workspaceId: string,
    trigger: AutomationTrigger,
  ): Promise<Automation[]> {
    return this.prisma.automation.findMany({
      where: {
        workspaceId,
        trigger,
        isActive: true,
        deletedAt: null,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  findDueCronAutomations(now: Date): Promise<Automation[]> {
    return this.prisma.automation.findMany({
      where: {
        trigger: AutomationTrigger.CRON,
        isActive: true,
        deletedAt: null,
        nextRunAt: { lte: now },
      },
    });
  }

  create(data: CreateAutomationData) {
    return this.prisma.automation.create({
      data: {
        workspaceId: data.workspaceId,
        createdById: data.createdById,
        name: data.name,
        description: data.description ?? null,
        trigger: data.trigger,
        scopeType: data.scopeType,
        scopeId: data.scopeId ?? null,
        compiledActions: data.compiledActions,
        conditions: data.conditions,
        isActive: data.isActive ?? true,
        cronExpression: data.cronExpression ?? null,
        timezone: data.timezone ?? null,
        nextRunAt: data.nextRunAt ?? null,
      },
      select: AUTOMATION_SELECT,
    });
  }

  update(id: string, data: UpdateAutomationData) {
    return this.prisma.automation.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && {
          description: data.description,
        }),
        ...(data.trigger !== undefined && { trigger: data.trigger }),
        ...(data.scopeType !== undefined && { scopeType: data.scopeType }),
        ...(data.scopeId !== undefined && { scopeId: data.scopeId }),
        ...(data.compiledActions !== undefined && {
          compiledActions: data.compiledActions,
        }),
        ...(data.conditions !== undefined && { conditions: data.conditions }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        ...(data.cronExpression !== undefined && {
          cronExpression: data.cronExpression,
        }),
        ...(data.timezone !== undefined && { timezone: data.timezone }),
        ...(data.nextRunAt !== undefined && { nextRunAt: data.nextRunAt }),
      },
      select: AUTOMATION_SELECT,
    });
  }

  softDelete(id: string) {
    return this.prisma.automation.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
      select: AUTOMATION_SELECT,
    });
  }

  recordExecution(id: string, executedAt: Date, tx?: Prisma.TransactionClient) {
    const db = tx ?? this.prisma;
    return db.automation.update({
      where: { id },
      data: {
        lastExecutedAt: executedAt,
        executionCount: { increment: 1 },
      },
      select: { id: true, executionCount: true, lastExecutedAt: true },
    });
  }

  updateNextRunAt(id: string, nextRunAt: Date | null) {
    return this.prisma.automation.update({
      where: { id },
      data: { nextRunAt },
      select: { id: true, nextRunAt: true },
    });
  }

  resolveListScope(listId: string) {
    return this.prisma.list.findUnique({
      where: { id: listId },
      select: { id: true, spaceId: true, folderId: true },
    });
  }

  listStatusesByScope(workspaceId: string) {
    return this.prisma.status.findMany({
      where: {
        deletedAt: null,
        OR: [
          { space: { workspaceId, deletedAt: null } },
          { folder: { space: { workspaceId, deletedAt: null } } },
          { list: { space: { workspaceId, deletedAt: null } } },
        ],
      },
      orderBy: [
        { spaceId: 'asc' },
        { folderId: 'asc' },
        { listId: 'asc' },
        { position: 'asc' },
      ],
      select: {
        id: true,
        name: true,
        type: true,
        color: true,
        position: true,
        spaceId: true,
        folderId: true,
        listId: true,
        space: { select: { id: true, name: true } },
        folder: { select: { id: true, name: true, spaceId: true } },
        list: { select: { id: true, name: true, folderId: true } },
      },
    });
  }
}
