import { Injectable } from '@nestjs/common';
import {
  NotificationChannel,
  NotificationPreferenceType,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';

@Injectable()
export class NotificationPreferencesRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAllByUser(userId: string) {
    return this.prisma.notificationPreference.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });
  }

  createManyIfMissing(
    userId: string,
    defaults: Array<{
      type: NotificationPreferenceType;
      channels: NotificationChannel[];
    }>,
  ) {
    return this.prisma.notificationPreference.createMany({
      data: defaults.map((d) => ({
        userId,
        type: d.type,
        channels: d.channels,
        enabled: true,
      })),
      skipDuplicates: true,
    });
  }

  upsert(
    userId: string,
    type: NotificationPreferenceType,
    patch: { channels?: NotificationChannel[]; enabled?: boolean },
  ) {
    const update: Prisma.NotificationPreferenceUpdateInput = {};
    if (patch.channels !== undefined) update.channels = { set: patch.channels };
    if (patch.enabled !== undefined) update.enabled = patch.enabled;

    return this.prisma.notificationPreference.upsert({
      where: { userId_type: { userId, type } },
      create: {
        userId,
        type,
        channels: patch.channels ?? [],
        enabled: patch.enabled ?? true,
      },
      update,
    });
  }
}
