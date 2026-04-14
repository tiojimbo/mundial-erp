import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ChannelType, ChannelVisibility } from '@prisma/client';

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

  @ApiProperty({ enum: ChannelVisibility })
  visibility: ChannelVisibility;

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
    entity: Record<string, unknown>,
    extras?: { activeMemberCount?: number },
  ): ChannelResponseDto {
    const dto = new ChannelResponseDto();
    dto.id = entity.id as string;
    dto.name = (entity.name as string) ?? null;
    dto.description = (entity.description as string) ?? null;
    dto.topic = (entity.topic as string) ?? null;
    dto.type = entity.type as ChannelType;
    dto.visibility = entity.visibility as ChannelVisibility;
    dto.locationEntity = (entity.locationEntity as string) ?? null;
    dto.locationId = (entity.locationId as string) ?? null;
    dto.memberCount =
      extras?.activeMemberCount ??
      (entity._count as Record<string, number>)?.members ??
      0;
    dto.unreadCount = 0;
    dto.lastMessage = null;
    dto.createdAt = entity.createdAt as Date;
    dto.updatedAt = entity.updatedAt as Date;
    return dto;
  }
}
