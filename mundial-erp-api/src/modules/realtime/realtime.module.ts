import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { NotificationsGateway } from './notifications.gateway';
import { WsAuthGuard } from '../../common/guards/ws-auth.guard';

@Module({
  imports: [AuthModule],
  providers: [NotificationsGateway, WsAuthGuard],
  exports: [NotificationsGateway],
})
export class RealtimeModule {}
