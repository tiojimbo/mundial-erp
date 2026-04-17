import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ChatMessageType, ContentFormat } from '@prisma/client';
import type { ChatMessageWithRelations } from '../messages.repository';

export class MessageAuthorDto {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
  @ApiPropertyOptional() email: string | null;
}

export class ReactionGroupDto {
  @ApiProperty() emojiName: string;
  @ApiProperty() count: number;
  @ApiProperty() userIds: string[];
}

export class MessageResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() channelId: string;
  @ApiProperty() author: MessageAuthorDto;
  @ApiPropertyOptional() parentMessageId: string | null;
  @ApiProperty({ enum: ChatMessageType }) type: ChatMessageType;
  @ApiProperty() content: string;
  @ApiProperty({ enum: ContentFormat }) contentFormat: ContentFormat;
  @ApiPropertyOptional() richContent: Record<string, unknown> | null;
  @ApiPropertyOptional() assignee: MessageAuthorDto | null;
  @ApiProperty() resolved: boolean;
  @ApiPropertyOptional() postData: Record<string, unknown> | null;
  @ApiPropertyOptional() editedAt: Date | null;
  @ApiProperty() replyCount: number;
  @ApiProperty() reactions: ReactionGroupDto[];
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;

  static fromEntity(entity: ChatMessageWithRelations): MessageResponseDto {
    const dto = new MessageResponseDto();
    dto.id = entity.id;
    dto.channelId = entity.channelId;
    dto.author = {
      id: entity.author.id,
      name: entity.author.name,
      email: entity.author.email,
    };
    dto.parentMessageId = entity.parentMessageId;
    dto.type = entity.type;
    dto.content = entity.content;
    dto.contentFormat = entity.contentFormat;
    dto.richContent = entity.richContent as Record<string, unknown> | null;
    dto.assignee = entity.assignee
      ? {
          id: entity.assignee.id,
          name: entity.assignee.name,
          email: entity.assignee.email,
        }
      : null;
    dto.resolved = entity.resolved;
    dto.postData = entity.postData as Record<string, unknown> | null;
    dto.editedAt = entity.editedAt;
    dto.replyCount = entity._count.replies;
    dto.reactions = [];
    dto.createdAt = entity.createdAt;
    dto.updatedAt = entity.updatedAt;
    return dto;
  }
}
