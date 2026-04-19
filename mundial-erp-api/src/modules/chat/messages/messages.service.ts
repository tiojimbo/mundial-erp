import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Prisma } from '@prisma/client';
import { MessagesRepository } from './messages.repository';
import { ChannelAccessService } from '../channels/channel-access.service';
import { CHAT_EVENTS } from '../constants/chat-events';
import { CreateMessageDto } from './dto/create-message.dto';
import { UpdateMessageDto } from './dto/update-message.dto';
import { ListMessagesQueryDto } from './dto/list-messages-query.dto';
import { MessageResponseDto } from './dto/message-response.dto';
import { CursorPaginationDto } from '../../../common/dtos/cursor-pagination.dto';

@Injectable()
export class MessagesService {
  constructor(
    private readonly messagesRepository: MessagesRepository,
    private readonly channelAccessService: ChannelAccessService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(
    channelId: string,
    dto: CreateMessageDto,
    userId: string,
  ): Promise<MessageResponseDto> {
    await this.channelAccessService.ensureMembershipOrAutoJoin(
      channelId,
      userId,
    );

    const entity = await this.messagesRepository.create({
      content: dto.content,
      type: dto.type ?? 'MESSAGE',
      contentFormat: dto.contentFormat ?? 'TEXT_MD',
      richContent: (dto.richContent as Prisma.InputJsonValue) ?? undefined,
      assignee: dto.assigneeId
        ? { connect: { id: dto.assigneeId } }
        : undefined,
      postData: (dto.postData as Prisma.InputJsonValue) ?? undefined,
      channel: { connect: { id: channelId } },
      author: { connect: { id: userId } },
      parentMessage: dto.parentMessageId
        ? { connect: { id: dto.parentMessageId } }
        : undefined,
    });

    const mentionIds = this.extractMentionIds(dto.content);
    await this.messagesRepository.createMentions(entity.id, mentionIds);

    if (dto.followers?.length) {
      await this.messagesRepository.createMessageFollowers(
        entity.id,
        dto.followers,
      );
    }

    if (dto.parentMessageId) {
      await this.messagesRepository.createMessageFollowers(
        dto.parentMessageId,
        [userId],
      );
    }

    const response = MessageResponseDto.fromEntity(entity);
    this.eventEmitter.emit(CHAT_EVENTS.MESSAGE_CREATED, {
      message: response,
      channelId,
    });

    return response;
  }

  async findByChannel(
    channelId: string,
    query: ListMessagesQueryDto,
    userId: string,
  ) {
    await this.channelAccessService.assertMembership(channelId, userId);
    const result = await this.messagesRepository.findByChannelId(channelId, {
      cursor: query.cursor,
      limit: query.limit,
    });
    return {
      ...result,
      items: result.items.map((item) => MessageResponseDto.fromEntity(item)),
    };
  }

  async findById(
    messageId: string,
    userId: string,
  ): Promise<MessageResponseDto> {
    const entity = await this.messagesRepository.findById(messageId);
    if (!entity) throw new NotFoundException('Mensagem nao encontrada');

    await this.channelAccessService.assertMembership(entity.channelId, userId);
    return MessageResponseDto.fromEntity(entity);
  }

  async update(
    messageId: string,
    dto: UpdateMessageDto,
    userId: string,
  ): Promise<MessageResponseDto> {
    const entity = await this.messagesRepository.findById(messageId);
    if (!entity) throw new NotFoundException('Mensagem nao encontrada');

    if (entity.authorId !== userId) {
      throw new ForbiddenException('Somente o autor pode editar a mensagem');
    }

    const isContentEdit = dto.content !== undefined;

    const updated = await this.messagesRepository.update(messageId, {
      ...(dto.content !== undefined && { content: dto.content }),
      ...(dto.contentFormat !== undefined && {
        contentFormat: dto.contentFormat,
      }),
      ...(dto.richContent !== undefined && {
        richContent: dto.richContent as Prisma.InputJsonValue,
      }),
      ...(dto.assigneeId !== undefined && {
        assignee: dto.assigneeId
          ? { connect: { id: dto.assigneeId } }
          : { disconnect: true },
      }),
      ...(dto.postData !== undefined && {
        postData: dto.postData as Prisma.InputJsonValue,
      }),
      ...(dto.resolved !== undefined && { resolved: dto.resolved }),
      ...(isContentEdit && { editedAt: new Date() }),
    });

    if (isContentEdit && dto.content) {
      await this.messagesRepository.deleteMentions(messageId);
      const mentionIds = this.extractMentionIds(dto.content);
      await this.messagesRepository.createMentions(messageId, mentionIds);
    }

    const response = MessageResponseDto.fromEntity(updated);
    this.eventEmitter.emit(CHAT_EVENTS.MESSAGE_UPDATED, {
      message: response,
      channelId: entity.channelId,
    });

    return response;
  }

  async remove(messageId: string, userId: string): Promise<void> {
    const entity = await this.messagesRepository.findById(messageId);
    if (!entity) throw new NotFoundException('Mensagem nao encontrada');

    if (entity.authorId !== userId) {
      const role = await this.channelAccessService.getMemberRole(
        entity.channelId,
        userId,
      );
      if (role !== 'OWNER' && role !== 'ADMIN') {
        throw new ForbiddenException(
          'Somente o autor ou OWNER/ADMIN do canal podem deletar a mensagem',
        );
      }
    }

    await this.messagesRepository.softDelete(messageId);
    this.eventEmitter.emit(CHAT_EVENTS.MESSAGE_DELETED, {
      messageId,
      channelId: entity.channelId,
    });
  }

  async findReplies(
    messageId: string,
    query: CursorPaginationDto,
    userId: string,
  ) {
    const entity = await this.messagesRepository.findById(messageId);
    if (!entity) throw new NotFoundException('Mensagem nao encontrada');

    await this.channelAccessService.assertMembership(entity.channelId, userId);
    const result = await this.messagesRepository.findReplies(messageId, {
      cursor: query.cursor,
      limit: query.limit,
    });
    return {
      ...result,
      items: result.items.map((item) => MessageResponseDto.fromEntity(item)),
    };
  }

  async findTaggedUsers(
    messageId: string,
    query: CursorPaginationDto,
    userId: string,
  ) {
    const entity = await this.messagesRepository.findById(messageId);
    if (!entity) throw new NotFoundException('Mensagem nao encontrada');

    await this.channelAccessService.assertMembership(entity.channelId, userId);
    return this.messagesRepository.findTaggedUsers(messageId, {
      cursor: query.cursor,
      limit: query.limit,
    });
  }

  async getChannelId(messageId: string): Promise<string> {
    const entity = await this.messagesRepository.findById(messageId);
    if (!entity) throw new NotFoundException('Mensagem nao encontrada');
    return entity.channelId;
  }

  private extractMentionIds(content: string): string[] {
    const mentionRegex = /@([a-z0-9]{20,30})/g;
    const ids: string[] = [];
    let match: RegExpExecArray | null;
    while ((match = mentionRegex.exec(content)) !== null) {
      ids.push(match[1]);
    }
    return [...new Set(ids)];
  }
}
