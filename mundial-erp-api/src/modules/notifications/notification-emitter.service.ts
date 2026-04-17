import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  NotificationType,
  NotificationCategory,
} from '@prisma/client';
import { NotificationsService } from './notifications.service';

@Injectable()
export class NotificationEmitterService {
  private readonly logger = new Logger(NotificationEmitterService.name);

  constructor(private readonly notificationsService: NotificationsService) {}

  @OnEvent('order.status.changed')
  async handleOrderStatusChanged(payload: {
    orderId: string;
    fromStatus: string;
    toStatus: string;
    assignedUserId?: string;
    title?: string;
  }): Promise<void> {
    if (!payload.assignedUserId) return;

    try {
      await this.notificationsService.create({
        userId: payload.assignedUserId,
        type: NotificationType.SYSTEM,
        category: NotificationCategory.OTHER,
        title: payload.title || 'Order status changed',
        description: `Order status changed from ${payload.fromStatus} to ${payload.toStatus}`,
        entityId: payload.orderId,
        entityUrl: `/comercial/pedidos/${payload.orderId}`,
      });
    } catch (error) {
      this.logger.error(
        `Failed to create notification for order.status.changed (orderId=${payload.orderId}): ${
          error instanceof Error ? error.message : String(error)
        }`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  @OnEvent('task.overdue')
  async handleTaskOverdue(payload: {
    taskInstanceId: string;
    activityName: string;
    orderId: string;
    assignedUserId: string;
  }): Promise<void> {
    try {
      await this.notificationsService.create({
        userId: payload.assignedUserId,
        type: NotificationType.TASK_OVERDUE,
        category: NotificationCategory.PRIMARY,
        title: payload.activityName,
        description: 'Task is overdue. Due date was past',
        entityId: payload.taskInstanceId,
        entityUrl: `/comercial/pedidos/${payload.orderId}`,
      });
    } catch (error) {
      this.logger.error(
        `Failed to create notification for task.overdue (taskInstanceId=${payload.taskInstanceId}): ${
          error instanceof Error ? error.message : String(error)
        }`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  @OnEvent('task.due_soon')
  async handleTaskDueSoon(payload: {
    taskInstanceId: string;
    activityName: string;
    orderId: string;
    assignedUserId: string;
  }): Promise<void> {
    try {
      await this.notificationsService.create({
        userId: payload.assignedUserId,
        type: NotificationType.TASK_DUE_SOON,
        category: NotificationCategory.PRIMARY,
        title: payload.activityName,
        description: 'Task is due soon. Due date is upcoming',
        entityId: payload.taskInstanceId,
        entityUrl: `/comercial/pedidos/${payload.orderId}`,
      });
    } catch (error) {
      this.logger.error(
        `Failed to create notification for task.due_soon (taskInstanceId=${payload.taskInstanceId}): ${
          error instanceof Error ? error.message : String(error)
        }`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  @OnEvent('chat.message.created')
  async handleChatMessage(payload: {
    channelId: string;
    senderId: string;
    recipientIds: string[];
    preview: string;
  }): Promise<void> {
    const promises = payload.recipientIds
      .filter((id) => id !== payload.senderId)
      .map((userId) =>
        this.notificationsService.create({
          userId,
          type: NotificationType.MESSAGE,
          category: NotificationCategory.OTHER,
          title: 'New message',
          description: payload.preview.slice(0, 200),
          entityId: payload.channelId,
          entityUrl: `/chat/${payload.channelId}`,
        }),
      );

    const results = await Promise.allSettled(promises);
    const failures = results.filter((r) => r.status === 'rejected');
    if (failures.length > 0) {
      this.logger.error(
        `Failed to create ${failures.length}/${results.length} notification(s) for chat.message.created (channelId=${payload.channelId})`,
      );
    }
  }

  @OnEvent('chat.mention')
  async handleChatMention(payload: {
    channelId: string;
    senderId: string;
    mentionedUserId: string;
    preview: string;
  }): Promise<void> {
    try {
      await this.notificationsService.create({
        userId: payload.mentionedUserId,
        type: NotificationType.MENTION,
        category: NotificationCategory.PRIMARY,
        title: 'You were mentioned',
        description: payload.preview.slice(0, 200),
        entityId: payload.channelId,
        entityUrl: `/chat/${payload.channelId}`,
      });
    } catch (error) {
      this.logger.error(
        `Failed to create notification for chat.mention (channelId=${payload.channelId}): ${
          error instanceof Error ? error.message : String(error)
        }`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  @OnEvent('handoff.created')
  async handleHandoffCreated(payload: {
    handoffInstanceId: string;
    fromDepartment: string;
    toDepartment: string;
    orderId: string;
    targetUserIds: string[];
  }): Promise<void> {
    const promises = payload.targetUserIds.map((userId) =>
      this.notificationsService.create({
        userId,
        type: NotificationType.SYSTEM,
        category: NotificationCategory.PRIMARY,
        title: `Handoff from ${payload.fromDepartment}`,
        description: `New handoff received from ${payload.fromDepartment} to ${payload.toDepartment}`,
        entityId: payload.handoffInstanceId,
        entityUrl: `/comercial/pedidos/${payload.orderId}`,
      }),
    );

    const results = await Promise.allSettled(promises);
    const failures = results.filter((r) => r.status === 'rejected');
    if (failures.length > 0) {
      this.logger.error(
        `Failed to create ${failures.length}/${results.length} notification(s) for handoff.created (handoffInstanceId=${payload.handoffInstanceId})`,
      );
    }
  }
}
