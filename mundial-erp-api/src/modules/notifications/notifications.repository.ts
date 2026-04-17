import { Injectable } from '@nestjs/common';
import {
  NotificationCategory,
  NotificationStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

type NotificationView = 'all' | 'primary' | 'other' | 'later' | 'cleared';

@Injectable()
export class NotificationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  private buildViewWhere(
    userId: string,
    view: NotificationView,
  ): Prisma.NotificationWhereInput {
    const base: Prisma.NotificationWhereInput = { userId };

    switch (view) {
      case 'all':
        return {
          ...base,
          status: { in: [NotificationStatus.UNREAD, NotificationStatus.READ] },
          deletedAt: null,
        };
      case 'primary':
        return {
          ...base,
          status: { in: [NotificationStatus.UNREAD, NotificationStatus.READ] },
          category: NotificationCategory.PRIMARY,
          deletedAt: null,
        };
      case 'other':
        return {
          ...base,
          status: { in: [NotificationStatus.UNREAD, NotificationStatus.READ] },
          category: NotificationCategory.OTHER,
          deletedAt: null,
        };
      case 'later':
        return {
          ...base,
          status: NotificationStatus.SNOOZED,
          deletedAt: null,
        };
      case 'cleared':
        return {
          ...base,
          status: NotificationStatus.CLEARED,
          deletedAt: null,
        };
    }
  }

  async findByView(userId: string, view: NotificationView) {
    return this.prisma.notification.findMany({
      where: this.buildViewWhere(userId, view),
      orderBy: { createdAt: 'desc' },
    });
  }

  async getCounts(userId: string) {
    const [all, primary, other, later, cleared] = await Promise.all([
      this.prisma.notification.count({
        where: {
          userId,
          status: NotificationStatus.UNREAD,
          category: {
            in: [NotificationCategory.PRIMARY, NotificationCategory.OTHER],
          },
          deletedAt: null,
        },
      }),
      this.prisma.notification.count({
        where: {
          userId,
          status: NotificationStatus.UNREAD,
          category: NotificationCategory.PRIMARY,
          deletedAt: null,
        },
      }),
      this.prisma.notification.count({
        where: {
          userId,
          status: NotificationStatus.UNREAD,
          category: NotificationCategory.OTHER,
          deletedAt: null,
        },
      }),
      this.prisma.notification.count({
        where: {
          userId,
          status: NotificationStatus.SNOOZED,
          deletedAt: null,
        },
      }),
      this.prisma.notification.count({
        where: {
          userId,
          status: NotificationStatus.CLEARED,
          deletedAt: null,
        },
      }),
    ]);

    return { all, primary, other, later, cleared };
  }

  async findById(id: string) {
    return this.prisma.notification.findFirst({
      where: { id, deletedAt: null },
    });
  }

  async create(data: Prisma.NotificationCreateInput) {
    return this.prisma.notification.create({ data });
  }

  async update(id: string, data: Prisma.NotificationUpdateInput) {
    return this.prisma.notification.update({ where: { id }, data });
  }

  async markAllReadByView(userId: string, view: NotificationView) {
    return this.prisma.notification.updateMany({
      where: {
        ...this.buildViewWhere(userId, view),
        status: NotificationStatus.UNREAD,
      },
      data: {
        status: NotificationStatus.READ,
        readAt: new Date(),
      },
    });
  }

  async clearAllByView(userId: string, view: NotificationView) {
    return this.prisma.notification.updateMany({
      where: this.buildViewWhere(userId, view),
      data: {
        status: NotificationStatus.CLEARED,
        clearedAt: new Date(),
      },
    });
  }

  async deleteAllCleared(userId: string) {
    return this.prisma.notification.deleteMany({
      where: {
        userId,
        status: NotificationStatus.CLEARED,
      },
    });
  }

  async softDelete(id: string) {
    return this.prisma.notification.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
