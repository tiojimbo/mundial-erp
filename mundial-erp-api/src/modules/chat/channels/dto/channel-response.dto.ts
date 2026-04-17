import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ChannelType } from '@prisma/client';
import type { ChatChannelWithCount } from '../channels.repository';

export class MessageSummaryDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  content: string;

  @ApiProperty()
  authorName: string;

  @ApiProperty()
  createdAt: Date;
}

export class ChannelResponseDto {
  @ApiProperty()
  id: string;

  @ApiPropertyOptional()
  name: string | null;

  @ApiPropertyOptional()
  description: string | null;

  @ApiPropertyOptional()
  topic: string | null;

  @ApiProperty({ enum: ChannelType })
  type: ChannelType;

  @ApiPropertyOptional()
  locationEntity: string | null;

  @ApiPropertyOptional()
  locationId: string | null;

  @ApiProperty()
  memberCount: number;

  @ApiProperty()
  unreadCount: number;

  @ApiPropertyOptional()
  lastMessage: MessageSummaryDto | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  static fromEntity(
    entity: ChatChannelWithCount,
    extras?: { activeMemberCount?: number },
  ): ChannelResponseDto {
    const dto = new ChannelResponseDto();
    dto.id = entity.id;
    dto.name = entity.name;
    dto.description = entity.description;
    dto.topic = entity.topic;
    dto.type = entity.type;
    dto.locationEntity = entity.locationEntity;
    dto.locationId = entity.locationId;
    dto.memberCount = extras?.activeMemberCount ?? entity._count.members;
    dto.unreadCount = 0;
    dto.lastMessage = null;
    dto.createdAt = entity.createdAt;
    dto.updatedAt = entity.updatedAt;
    return dto;
  }
}
