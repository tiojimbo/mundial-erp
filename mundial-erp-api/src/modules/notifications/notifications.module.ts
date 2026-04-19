import { Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { NotificationsRepository } from './notifications.repository';
import { NotificationEmitterService } from './notification-emitter.service';

@Module({
  controllers: [NotificationsController],
  providers: [
    NotificationsRepository,
    NotificationsService,
    NotificationEmitterService,
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}
