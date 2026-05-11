import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { NotificationStatus } from '@prisma/client';
import { NotificationsRepository } from './notifications.repository';
import { NotificationResponseDto } from './dto/notification-response.dto';
import { NotificationsListResponseDto } from './dto/notification-counts.dto';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { SnoozeNotificationDto } from './dto/snooze-notification.dto';
import { BulkActionDto } from './dto/bulk-action.dto';
import { NotificationQueryDto } from './dto/notification-query.dto';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly notificationsRepository: NotificationsRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async findByView(
    userId: string,
    query: NotificationQueryDto,
  ): Promise<NotificationsListResponseDto & { total: number }> {
    const [{ items, total }, counts] = await Promise.all([
      this.notificationsRepository.findByView(userId, query.view as any, {
        skip: query.skip,
        take: query.limit,
      }),
      this.notificationsRepository.getCounts(userId),
    ]);

    return {
      items: items.map(NotificationResponseDto.fromEntity),
      counts,
      total,
    };
  }

  private async findAndValidateOwnership(userId: string, id: string) {
    const notification = await this.notificationsRepository.findById(id);
    if (!notification || notification.userId !== userId) {
      throw new NotFoundException(`Notification "${id}" not found`);
    }
    return notification;
  }

  async markAsRead(userId: string, id: string): Promise<void> {
    const notification = await this.findAndValidateOwnership(userId, id);
    if (notification.status === NotificationStatus.READ) return;
    await this.notificationsRepository.update(id, {
      status: NotificationStatus.READ,
      readAt: new Date(),
    });
  }

  async markAsUnread(userId: string, id: string): Promise<void> {
    await this.findAndValidateOwnership(userId, id);
    await this.notificationsRepository.update(id, {
      status: NotificationStatus.UNREAD,
      readAt: null,
    });
  }

  async clear(userId: string, id: string): Promise<void> {
    const notification = await this.findAndValidateOwnership(userId, id);
    if (notification.status === NotificationStatus.CLEARED) return;
    await this.notificationsRepository.update(id, {
      status: NotificationStatus.CLEARED,
      clearedAt: new Date(),
    });
  }

  async unclear(userId: string, id: string): Promise<void> {
    await this.findAndValidateOwnership(userId, id);
    await this.notificationsRepository.update(id, {
      status: NotificationStatus.READ,
      clearedAt: null,
    });
  }

  async snooze(
    userId: string,
    id: string,
    dto: SnoozeNotificationDto,
  ): Promise<void> {
    await this.findAndValidateOwnership(userId, id);
    const until = new Date(dto.until);
    if (until <= new Date()) {
      throw new BadRequestException('Snooze date must be in the future');
    }
    await this.notificationsRepository.update(id, {
      status: NotificationStatus.SNOOZED,
      snoozedUntil: until,
    });
  }

  async unsnooze(userId: string, id: string): Promise<void> {
    await this.findAndValidateOwnership(userId, id);
    await this.notificationsRepository.update(id, {
      status: NotificationStatus.UNREAD,
      snoozedUntil: null,
    });
  }

  async markAllRead(userId: string, dto: BulkActionDto): Promise<void> {
    await this.notificationsRepository.markAllReadByView(
      userId,
      dto.view as any,
    );
  }

  async clearAll(userId: string, dto: BulkActionDto): Promise<void> {
    await this.notificationsRepository.clearAllByView(userId, dto.view as any);
  }

  async deleteAllCleared(userId: string): Promise<void> {
    await this.notificationsRepository.deleteAllCleared(userId);
  }

  async remove(userId: string, id: string): Promise<void> {
    await this.findAndValidateOwnership(userId, id);
    await this.notificationsRepository.softDelete(id);
  }

  async create(dto: CreateNotificationDto): Promise<NotificationResponseDto> {
    const notification = await this.notificationsRepository.create({
      user: { connect: { id: dto.userId } },
      type: dto.type,
      category: dto.category,
      title: dto.title,
      description: dto.description,
      entityId: dto.entityId,
      entityUrl: dto.entityUrl,
    });
    const response = NotificationResponseDto.fromEntity(notification);
    this.eventEmitter.emit('notification.created', {
      userId: dto.userId,
      notification: response,
    });
    return response;
  }
}
