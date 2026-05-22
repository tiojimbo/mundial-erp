import { Injectable } from '@nestjs/common';
import {
  NotificationChannel,
  NotificationPreferenceType,
} from '@prisma/client';
import { NotificationPreferencesRepository } from './notification-preferences.repository';
import {
  NotificationPreferenceResponseDto,
  UpsertNotificationPreferenceDto,
} from './dto/notification-preference.dto';

const DEFAULT_PREFERENCES: Array<{
  type: NotificationPreferenceType;
  channels: NotificationChannel[];
}> = [
  { type: 'TASK_ASSIGNED', channels: ['IN_APP', 'EMAIL', 'PUSH'] },
  { type: 'TASK_DUE_SOON', channels: ['IN_APP', 'EMAIL', 'PUSH'] },
  { type: 'TASK_OVERDUE', channels: ['IN_APP', 'EMAIL', 'PUSH'] },
  { type: 'TASK_COMMENT', channels: ['IN_APP', 'PUSH'] },
  { type: 'TASK_STATUS_CHANGE', channels: ['IN_APP', 'PUSH'] },
  { type: 'MENTION', channels: ['IN_APP', 'EMAIL', 'PUSH'] },
  { type: 'TASK_NAME_CHANGE', channels: ['IN_APP'] },
  { type: 'TASK_DESCRIPTION_CHANGE', channels: ['IN_APP'] },
  { type: 'TASK_PRIORITY_CHANGE', channels: ['IN_APP'] },
  { type: 'TASK_DUE_DATE_CHANGE', channels: ['IN_APP'] },
  { type: 'TASK_START_DATE_CHANGE', channels: ['IN_APP'] },
  { type: 'TASK_CUSTOM_FIELD_CHANGE', channels: ['IN_APP'] },
  { type: 'ACCESS_REQUESTED', channels: ['IN_APP', 'EMAIL', 'PUSH'] },
];

@Injectable()
export class NotificationPreferencesService {
  constructor(private readonly repository: NotificationPreferencesRepository) {}

  async listForUser(
    userId: string,
  ): Promise<NotificationPreferenceResponseDto[]> {
    let items = await this.repository.findAllByUser(userId);
    if (items.length < DEFAULT_PREFERENCES.length) {
      await this.repository.createManyIfMissing(userId, DEFAULT_PREFERENCES);
      items = await this.repository.findAllByUser(userId);
    }
    return items.map((p) => ({
      id: p.id,
      userId: p.userId,
      type: p.type,
      channels: p.channels,
      enabled: p.enabled,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    }));
  }

  async upsert(
    userId: string,
    type: NotificationPreferenceType,
    dto: UpsertNotificationPreferenceDto,
  ): Promise<NotificationPreferenceResponseDto> {
    const row = await this.repository.upsert(userId, type, dto);
    return {
      id: row.id,
      userId: row.userId,
      type: row.type,
      channels: row.channels,
      enabled: row.enabled,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
