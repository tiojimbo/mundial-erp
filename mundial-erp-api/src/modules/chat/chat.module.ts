import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ChannelsController } from './channels/channels.controller';
import { ChannelsRepository } from './channels/channels.repository';
import { ChannelsService } from './channels/channels.service';
import {
  ChannelMessagesController,
  MessagesController,
} from './messages/messages.controller';
import { MessagesRepository } from './messages/messages.repository';
import { MessagesService } from './messages/messages.service';
import { ReactionsController } from './reactions/reactions.controller';
import { ReactionsRepository } from './reactions/reactions.repository';
import { ReactionsService } from './reactions/reactions.service';
import { ChatGateway } from './gateway/chat.gateway';
import { WsAuthGuard } from '../../common/guards/ws-auth.guard';

@Module({
  imports: [AuthModule],
  controllers: [
    ChannelsController,
    ChannelMessagesController,
    MessagesController,
    ReactionsController,
  ],
  providers: [
    ChannelsRepository,
    ChannelsService,
    MessagesRepository,
    MessagesService,
    ReactionsRepository,
    ReactionsService,
    WsAuthGuard,
    ChatGateway,
  ],
  exports: [ChannelsService, MessagesService],
})
export class ChatModule {}
