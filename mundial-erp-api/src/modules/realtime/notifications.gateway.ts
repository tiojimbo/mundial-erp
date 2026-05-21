import { Logger } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { OnEvent } from '@nestjs/event-emitter';
import { Server, Socket } from 'socket.io';
import { WsAuthGuard } from '../../common/guards/ws-auth.guard';

type NotificationCreatedPayload = {
  userId: string;
  notification: unknown;
};

@WebSocketGateway({ namespace: '/notifications' })
export class NotificationsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() server!: Server;
  private readonly logger = new Logger(NotificationsGateway.name);

  constructor(private readonly wsAuthGuard: WsAuthGuard) {}

  handleConnection(client: Socket) {
    const user = this.wsAuthGuard.authenticate(client);
    if (!user) {
      client.disconnect();
      return;
    }
    client.data.user = user;
    void client.join(`user:${user.sub}`);
    this.logger.log(`WS /notifications connected: ${user.email}`);
  }

  handleDisconnect(client: Socket) {
    const user = client.data.user;
    if (user) {
      this.logger.log(`WS /notifications disconnected: ${user.email}`);
    }
  }

  @OnEvent('notification.created')
  handleNotificationCreated(payload: NotificationCreatedPayload) {
    this.server
      .to(`user:${payload.userId}`)
      .emit('notification', payload.notification);
  }
}
