import { Injectable, Logger, NotImplementedException } from '@nestjs/common';
import { Prisma, TaskPriority } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { ActionId, ACTION_IDS } from '../catalog/actions.catalog';
import type { TaskEventContext } from '../events/task-events.types';

export interface ActionInvocation {
  type: string;
  params: Record<string, unknown>;
}

export interface ActionResult {
  type: string;
  status: 'ok' | 'skipped' | 'not_implemented' | 'error';
  message?: string;
}

const ACTION_ID_SET = new Set<string>(ACTION_IDS);

@Injectable()
export class ActionRunnerService {
  private readonly logger = new Logger(ActionRunnerService.name);

  constructor(private readonly prisma: PrismaService) {}

  async run(
    action: ActionInvocation,
    context: TaskEventContext,
  ): Promise<ActionResult> {
    if (!ACTION_ID_SET.has(action.type)) {
      throw new NotImplementedException(`Action desconhecida: ${action.type}`);
    }
    const params = action.params ?? {};
    try {
      switch (action.type as ActionId) {
        case 'change_status':
          return await this.changeStatus(context.taskId, params);
        case 'move_to_list':
          return await this.moveToList(context.taskId, params);
        case 'change_priority':
          return await this.changePriority(context.taskId, params);
        case 'change_assignees':
          return await this.changeAssignees(
            context.taskId,
            params,
            context.actorUserId,
          );
        case 'change_task_name':
          return await this.changeTaskName(context.taskId, params);
        case 'change_task_type':
          return await this.changeTaskType(context.taskId, params);
        case 'change_tags':
          return await this.changeTags(context.taskId, params);
        case 'set_custom_field':
          return await this.setCustomField(context.taskId, params);
        case 'set_time_estimate':
          return await this.setTimeEstimate(context.taskId, params);
        case 'add_task_link':
          return await this.addTaskLink(context.taskId, params);
        case 'change_due_date':
          return await this.changeDueDate(context.taskId, params);
        case 'change_start_date':
          return await this.changeStartDate(context.taskId, params);
        case 'add_comment':
          return await this.addComment(
            context.taskId,
            params,
            context.actorUserId,
          );
        case 'send_notification':
          return await this.sendNotification(context, params);
        case 'create_subtask':
          return await this.createSubtask(context, params);
        case 'delete_task':
          return await this.deleteTask(context.taskId);
        case 'duplicate_task':
          return await this.duplicateTask(context.taskId, params);
        case 'create_list':
          return await this.createList(context, params);
        case 'call_webhook':
          return await this.callWebhook(params, context);
        case 'send_channel_message':
        case 'send_direct_message':
          return {
            type: action.type,
            status: 'not_implemented',
            message: 'Chat integration nao disponivel',
          };
        default:
          return {
            type: action.type,
            status: 'not_implemented',
            message: `Action ${action.type} nao implementada`,
          };
      }
    } catch (err) {
      this.logger.error(
        `[action] ${action.type} falhou: ${(err as Error).message}`,
      );
      return {
        type: action.type,
        status: 'error',
        message: (err as Error).message,
      };
    }
  }

  private async changeStatus(taskId: string, params: Record<string, unknown>) {
    const statusId = String(params.statusId ?? '');
    if (!statusId) return this.skip('change_status', 'statusId vazio');
    await this.prisma.workItem.update({
      where: { id: taskId },
      data: { statusId },
    });
    return this.ok('change_status');
  }

  private async moveToList(taskId: string, params: Record<string, unknown>) {
    const listId = String(params.listId ?? '');
    if (!listId) return this.skip('move_to_list', 'listId vazio');
    await this.prisma.workItem.update({
      where: { id: taskId },
      data: { listId },
    });
    return this.ok('move_to_list');
  }

  private async changePriority(
    taskId: string,
    params: Record<string, unknown>,
  ) {
    const priority = String(params.priority ?? '') as TaskPriority;
    if (!priority) return this.skip('change_priority', 'priority vazio');
    await this.prisma.workItem.update({
      where: { id: taskId },
      data: { priority },
    });
    return this.ok('change_priority');
  }

  private async changeAssignees(
    taskId: string,
    params: Record<string, unknown>,
    actorUserId: string | null,
  ) {
    const mode = String(params.mode ?? 'set');
    const userIds = Array.isArray(params.userIds)
      ? (params.userIds as string[])
      : [];

    await this.prisma.$transaction(async (tx) => {
      if (mode === 'set') {
        await tx.workItemAssignee.deleteMany({ where: { workItemId: taskId } });
      }
      if (mode === 'remove') {
        await tx.workItemAssignee.deleteMany({
          where: { workItemId: taskId, userId: { in: userIds } },
        });
        return;
      }
      for (const userId of userIds) {
        await tx.workItemAssignee.upsert({
          where: { workItemId_userId: { workItemId: taskId, userId } },
          create: { workItemId: taskId, userId, assignedBy: actorUserId },
          update: {},
        });
      }
    });
    return this.ok('change_assignees');
  }

  private async changeTaskName(
    taskId: string,
    params: Record<string, unknown>,
  ) {
    const name = String(params.name ?? '');
    if (!name) return this.skip('change_task_name', 'name vazio');
    await this.prisma.workItem.update({
      where: { id: taskId },
      data: { title: name },
    });
    return this.ok('change_task_name');
  }

  private async changeTaskType(
    taskId: string,
    params: Record<string, unknown>,
  ) {
    const customTaskTypeId = String(params.customTaskTypeId ?? '');
    if (!customTaskTypeId)
      return this.skip('change_task_type', 'customTaskTypeId vazio');
    await this.prisma.workItem.update({
      where: { id: taskId },
      data: { customTypeId: customTaskTypeId },
    });
    return this.ok('change_task_type');
  }

  private async changeTags(taskId: string, params: Record<string, unknown>) {
    const mode = String(params.mode ?? 'set');
    const tagIds = Array.isArray(params.tagIds)
      ? (params.tagIds as string[])
      : [];
    await this.prisma.$transaction(async (tx) => {
      if (mode === 'set') {
        await tx.workItemTagLink.deleteMany({ where: { workItemId: taskId } });
      }
      if (mode === 'remove') {
        await tx.workItemTagLink.deleteMany({
          where: { workItemId: taskId, tagId: { in: tagIds } },
        });
        return;
      }
      for (const tagId of tagIds) {
        await tx.workItemTagLink.upsert({
          where: { workItemId_tagId: { workItemId: taskId, tagId } },
          create: { workItemId: taskId, tagId },
          update: {},
        });
      }
    });
    return this.ok('change_tags');
  }

  private async setCustomField(
    taskId: string,
    params: Record<string, unknown>,
  ) {
    const definitionId = String(params.customFieldDefinitionId ?? '');
    if (!definitionId)
      return this.skip('set_custom_field', 'customFieldDefinitionId vazio');
    const fields = this.serializeCustomFieldValue(params.value);
    await this.prisma.customFieldValue.upsert({
      where: {
        workItemId_definitionId: { workItemId: taskId, definitionId },
      },
      create: { workItemId: taskId, definitionId, ...fields },
      update: fields,
    });
    return this.ok('set_custom_field');
  }

  private serializeCustomFieldValue(raw: unknown): {
    valueText: string | null;
    valueNumber: Prisma.Decimal | number | null;
    valueDate: Date | null;
  } {
    if (raw === null || raw === undefined) {
      return { valueText: null, valueNumber: null, valueDate: null };
    }
    if (typeof raw === 'number') {
      return { valueText: null, valueNumber: raw, valueDate: null };
    }
    if (raw instanceof Date) {
      return { valueText: null, valueNumber: null, valueDate: raw };
    }
    return {
      valueText: typeof raw === 'string' ? raw : JSON.stringify(raw),
      valueNumber: null,
      valueDate: null,
    };
  }

  private async setTimeEstimate(
    taskId: string,
    params: Record<string, unknown>,
  ) {
    const minutes = Number(params.estimateMinutes ?? 0);
    if (!Number.isFinite(minutes))
      return this.skip('set_time_estimate', 'estimateMinutes invalido');
    await this.prisma.workItem.update({
      where: { id: taskId },
      data: { estimatedMinutes: minutes },
    });
    return this.ok('set_time_estimate');
  }

  private async addTaskLink(taskId: string, params: Record<string, unknown>) {
    const targetTaskId = String(params.targetTaskId ?? '');
    const linkType = String(params.linkType ?? 'RELATES_TO');
    if (!targetTaskId) return this.skip('add_task_link', 'targetTaskId vazio');
    await this.prisma.workItemLink.create({
      data: {
        fromTaskId: taskId,
        toTaskId: targetTaskId,
        type: linkType as Prisma.WorkItemLinkCreateInput['type'],
      },
    });
    return this.ok('add_task_link');
  }

  private async changeDueDate(taskId: string, params: Record<string, unknown>) {
    const dueDate = this.parseDate(params.dueDate);
    await this.prisma.workItem.update({
      where: { id: taskId },
      data: { dueDate },
    });
    return this.ok('change_due_date');
  }

  private async changeStartDate(
    taskId: string,
    params: Record<string, unknown>,
  ) {
    const startDate = this.parseDate(params.startDate);
    await this.prisma.workItem.update({
      where: { id: taskId },
      data: { startDate },
    });
    return this.ok('change_start_date');
  }

  private async addComment(
    taskId: string,
    params: Record<string, unknown>,
    actorUserId: string | null,
  ) {
    const content = String(params.content ?? '');
    if (!content) return this.skip('add_comment', 'content vazio');
    await this.prisma.workItemComment.create({
      data: {
        workItemId: taskId,
        authorId: actorUserId ?? 'system',
        content,
        mentions: (params.mentions ?? []) as Prisma.InputJsonValue,
      },
    });
    return this.ok('add_comment');
  }

  private async sendNotification(
    ctx: TaskEventContext,
    params: Record<string, unknown>,
  ) {
    const userIds = Array.isArray(params.userIds)
      ? (params.userIds as string[])
      : [];
    const message = String(params.message ?? '');
    if (userIds.length === 0 || !message)
      return this.skip('send_notification', 'userIds ou message vazios');
    await this.prisma.notification.createMany({
      data: userIds.map((userId) => ({
        userId,
        type: 'SYSTEM' as Prisma.NotificationCreateManyInput['type'],
        category: 'PRIMARY' as Prisma.NotificationCreateManyInput['category'],
        title: 'Automação',
        description: message,
        entityId: ctx.taskId,
      })),
      skipDuplicates: true,
    });
    return this.ok('send_notification');
  }

  private async createSubtask(
    ctx: TaskEventContext,
    params: Record<string, unknown>,
  ) {
    const name = String(params.name ?? '');
    if (!name) return this.skip('create_subtask', 'name vazio');
    const parent = await this.prisma.workItem.findUnique({
      where: { id: ctx.taskId },
      select: { listId: true, statusId: true, creatorId: true },
    });
    if (!parent) return this.skip('create_subtask', 'task pai nao encontrada');

    const subtask = await this.prisma.workItem.create({
      data: {
        title: name,
        description: (params.description as string) ?? null,
        listId: parent.listId,
        statusId: parent.statusId,
        creatorId: parent.creatorId,
        parentId: ctx.taskId,
      },
      select: { id: true },
    });

    const assigneeIds = Array.isArray(params.assigneeIds)
      ? (params.assigneeIds as string[])
      : [];
    if (assigneeIds.length > 0) {
      await this.prisma.workItemAssignee.createMany({
        data: assigneeIds.map((userId) => ({
          workItemId: subtask.id,
          userId,
          assignedBy: ctx.actorUserId,
        })),
        skipDuplicates: true,
      });
    }
    return this.ok('create_subtask');
  }

  private async deleteTask(taskId: string) {
    await this.prisma.workItem.update({
      where: { id: taskId },
      data: { deletedAt: new Date() },
    });
    return this.ok('delete_task');
  }

  private async duplicateTask(taskId: string, params: Record<string, unknown>) {
    const source = await this.prisma.workItem.findUnique({
      where: { id: taskId },
      select: {
        title: true,
        description: true,
        listId: true,
        statusId: true,
        priority: true,
        creatorId: true,
        customTypeId: true,
        dueDate: true,
        startDate: true,
        estimatedMinutes: true,
      },
    });
    if (!source)
      return this.skip('duplicate_task', 'task origem nao encontrada');
    const targetListId = String(params.targetListId ?? source.listId);
    await this.prisma.workItem.create({
      data: {
        title: `${source.title} (copia)`,
        description: source.description,
        listId: targetListId,
        statusId: source.statusId,
        priority: source.priority,
        creatorId: source.creatorId,
        customTypeId: source.customTypeId,
        dueDate: source.dueDate,
        startDate: source.startDate,
        estimatedMinutes: source.estimatedMinutes,
      },
    });
    return this.ok('duplicate_task');
  }

  private async createList(
    ctx: TaskEventContext,
    params: Record<string, unknown>,
  ) {
    const name = String(params.name ?? '');
    const folderId = String(params.folderId ?? '');
    if (!name || !folderId)
      return this.skip('create_list', 'name ou folderId vazio');
    const folder = await this.prisma.folder.findUnique({
      where: { id: folderId },
      select: { spaceId: true },
    });
    if (!folder) return this.skip('create_list', 'folder nao encontrado');
    await this.prisma.list.create({
      data: {
        name,
        slug: `${folderId}-${Date.now()}`,
        folderId,
        spaceId: folder.spaceId,
        creatorId: ctx.actorUserId,
      },
    });
    return this.ok('create_list');
  }

  private async callWebhook(
    params: Record<string, unknown>,
    ctx: TaskEventContext,
  ) {
    const url = String(params.url ?? '');
    const method = String(params.method ?? 'POST').toUpperCase();
    if (!url) return this.skip('call_webhook', 'url vazia');

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(params.headers as Record<string, string> | undefined),
    };
    const body = JSON.stringify({
      task: { id: ctx.taskId, listId: ctx.listId },
      workspaceId: ctx.workspaceId,
      payload: params.body ?? null,
    });

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);
    try {
      const response = await fetch(url, {
        method,
        headers,
        body: method === 'GET' || method === 'DELETE' ? undefined : body,
        signal: controller.signal,
      });
      if (!response.ok) {
        return {
          type: 'call_webhook',
          status: 'error' as const,
          message: `HTTP ${response.status}`,
        };
      }
      return this.ok('call_webhook');
    } finally {
      clearTimeout(timeout);
    }
  }

  private parseDate(value: unknown): Date | null {
    if (!value) return null;
    if (value instanceof Date) return value;
    const parsed = new Date(String(value));
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  private ok(type: string): ActionResult {
    return { type, status: 'ok' };
  }

  private skip(type: string, message: string): ActionResult {
    return { type, status: 'skipped', message };
  }
}
