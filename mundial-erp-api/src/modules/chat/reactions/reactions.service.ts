import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ReactionsRepository } from './reactions.repository';
import { MessagesService } from '../messages/messages.service';
import { ChannelAccessService } from '../channels/channel-access.service';
import { CHAT_EVENTS } from '../constants/chat-events';
import { CreateReactionDto } from './dto/create-reaction.dto';
import { CursorPaginationDto } from '../../../common/dtos/cursor-pagination.dto';

@Injectable()
export class ReactionsService {
  constructor(
    private readonly reactionsRepository: ReactionsRepository,
    private readonly messagesService: MessagesService,
    private readonly channelAccessService: ChannelAccessService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async addReaction(
    messageId: string,
    dto: CreateReactionDto,
    userId: string,
  ): Promise<void> {
    const channelId = await this.messagesService.getChannelId(messageId);
    await this.channelAccessService.assertMembership(channelId, userId);

    const alreadyExists = await this.reactionsRepository.exists(
      messageId,
      userId,
      dto.emojiName,
    );
    if (alreadyExists) {
      throw new BadRequestException('Voce ja reagiu com este emoji');
    }

    await this.reactionsRepository.create(messageId, userId, dto.emojiName);

    this.eventEmitter.emit(CHAT_EVENTS.REACTION_ADDED, {
      messageId,
      channelId,
      userId,
      emojiName: dto.emojiName,
    });
  }

  async removeReaction(
    messageId: string,
    emojiName: string,
    userId: string,
  ): Promise<void> {
    const channelId = await this.messagesService.getChannelId(messageId);

    const exists = await this.reactionsRepository.exists(
      messageId,
      userId,
      emojiName,
    );
    if (!exists) {
      throw new NotFoundException('Reacao nao encontrada');
    }

    await this.reactionsRepository.delete(messageId, userId, emojiName);

    this.eventEmitter.emit(CHAT_EVENTS.REACTION_REMOVED, {
      messageId,
      channelId,
      userId,
      emojiName,
    });
  }

  async getReactions(
    messageId: string,
    query: CursorPaginationDto,
    userId: string,
  ) {
    const channelId = await this.messagesService.getChannelId(messageId);
    await this.channelAccessService.assertMembership(channelId, userId);

    return this.reactionsRepository.findByMessage(messageId, {
      cursor: query.cursor,
      limit: query.limit,
    });
  }
}
