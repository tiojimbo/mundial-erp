import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ChatMessageType, ContentFormat } from '@prisma/client';

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

  static fromEntity(entity: Record<string, unknown>): MessageResponseDto {
    const dto = new MessageResponseDto();
    dto.id = entity.id as string;
    dto.channelId = entity.channelId as string;

    const author = entity.author as Record<string, unknown> | undefined;
    dto.author = {
      id: (author?.id as string) ?? '',
      name: (author?.name as string) ?? '',
      email: (author?.email as string) ?? null,
    };

    dto.parentMessageId = (entity.parentMessageId as string) ?? null;
    dto.type = entity.type as ChatMessageType;
    dto.content = entity.content as string;
    dto.contentFormat = entity.contentFormat as ContentFormat;
    dto.richContent =
      (entity.richContent as Record<string, unknown>) ?? null;

    const assignee = entity.assignee as Record<string, unknown> | null;
    dto.assignee = assignee
      ? {
          id: assignee.id as string,
          name: assignee.name as string,
          email: (assignee.email as string) ?? null,
        }
      : null;

    dto.resolved = entity.resolved as boolean;
    dto.postData = (entity.postData as Record<string, unknown>) ?? null;
    dto.editedAt = (entity.editedAt as Date) ?? null;

    const count = entity._count as Record<string, number> | undefined;
    dto.replyCount = count?.replies ?? 0;

    dto.reactions = [];
    dto.createdAt = entity.createdAt as Date;
    dto.updatedAt = entity.updatedAt as Date;
    return dto;
  }
}
