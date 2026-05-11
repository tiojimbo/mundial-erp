import { Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { NotificationsRepository } from './notifications.repository';
import { NotificationEmitterService } from './notification-emitter.service';
import { NotificationPreferencesController } from './preferences/notification-preferences.controller';
import { NotificationPreferencesService } from './preferences/notification-preferences.service';
import { NotificationPreferencesRepository } from './preferences/notification-preferences.repository';

@Module({
  controllers: [NotificationsController, NotificationPreferencesController],
  providers: [
    NotificationsRepository,
    NotificationsService,
    NotificationEmitterService,
    NotificationPreferencesRepository,
    NotificationPreferencesService,
  ],
  exports: [NotificationsService, NotificationPreferencesService],
})
export class NotificationsModule {}
