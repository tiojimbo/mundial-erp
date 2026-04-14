import { Logger } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { OnEvent } from '@nestjs/event-emitter';
import { Server, Socket } from 'socket.io';
import { WsAuthGuard } from '../../../common/guards/ws-auth.guard';
import { ChannelsService } from '../channels/channels.service';

@WebSocketGateway({ namespace: '/chat' })
export class ChatGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(ChatGateway.name);
  private onlineUsers = new Map<string, Set<string>>();

  constructor(
    private readonly wsAuthGuard: WsAuthGuard,
    private readonly channelsService: ChannelsService,
  ) {}

  async handleConnection(client: Socket) {
    const user = await this.wsAuthGuard.authenticate(client);
    if (!user) {
      client.disconnect();
      return;
    }

    client.data.user = user;

    const channelIds =
      await this.channelsService.findChannelIdsForUser(user.sub);
    for (const id of channelIds) {
      client.join(`channel:${id}`);
    }

    if (!this.onlineUsers.has(user.sub)) {
      this.onlineUsers.set(user.sub, new Set());
      this.server.emit('user:online', { userId: user.sub });
    }
    this.onlineUsers.get(user.sub)!.add(client.id);

    this.logger.log(`WS connected: ${user.email} (${client.id})`);
  }

  async handleDisconnect(client: Socket) {
    const user = client.data.user;
    if (!user) return;

    const sockets = this.onlineUsers.get(user.sub);
    if (sockets) {
      sockets.delete(client.id);
      if (sockets.size === 0) {
        this.onlineUsers.delete(user.sub);
        this.server.emit('user:offline', { userId: user.sub });
      }
    }

    this.logger.log(`WS disconnected: ${user.email} (${client.id})`);
  }

  @SubscribeMessage('message:typing')
  handleTyping(client: Socket, payload: { channelId: string }) {
    const user = client.data.user;
    if (!user) return;

    client.to(`channel:${payload.channelId}`).emit('typing:start', {
      channelId: payload.channelId,
      userId: user.sub,
    });
  }

  @OnEvent('chat.message.created')
  onMessageCreated(payload: {
    message: Record<string, unknown>;
    channelId: string;
  }) {
    this.server
      .to(`channel:${payload.channelId}`)
      .emit('message:new', payload.message);
  }

  @OnEvent('chat.message.updated')
  onMessageUpdated(payload: {
    message: Record<string, unknown>;
    channelId: string;
  }) {
    this.server
      .to(`channel:${payload.channelId}`)
      .emit('message:updated', payload.message);
  }

  @OnEvent('chat.message.deleted')
  onMessageDeleted(payload: { messageId: string; channelId: string }) {
    this.server
      .to(`channel:${payload.channelId}`)
      .emit('message:deleted', payload);
  }

  @OnEvent('chat.reaction.added')
  onReactionAdded(payload: {
    messageId: string;
    channelId: string;
    userId: string;
    emojiName: string;
  }) {
    this.server
      .to(`channel:${payload.channelId}`)
      .emit('reaction:added', payload);
  }

  @OnEvent('chat.reaction.removed')
  onReactionRemoved(payload: {
    messageId: string;
    channelId: string;
    userId: string;
    emojiName: string;
  }) {
    this.server
      .to(`channel:${payload.channelId}`)
      .emit('reaction:removed', payload);
  }

  @OnEvent('chat.channel.members-added')
  onMembersAdded(payload: { channelId: string; userIds: string[] }) {
    this.server
      .to(`channel:${payload.channelId}`)
      .emit('member:added', payload);
  }

  @OnEvent('chat.channel.member-removed')
  onMemberRemoved(payload: { channelId: string; userId: string }) {
    this.server
      .to(`channel:${payload.channelId}`)
      .emit('member:removed', payload);
  }
}
