import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Handoff, OrderStatus, Prisma } from '@prisma/client';

export class HandoffResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  fromProcessId: string;

  @ApiPropertyOptional()
  fromProcessName?: string;

  @ApiProperty()
  toProcessId: string;

  @ApiPropertyOptional()
  toProcessName?: string;

  @ApiPropertyOptional({ enum: OrderStatus })
  triggerOnStatus: OrderStatus | null;

  @ApiPropertyOptional()
  validationRules: Prisma.JsonValue | null;

  @ApiProperty()
  autoAdvance: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  static fromEntity(
    entity: Handoff & {
      fromList?: { name: string };
      toList?: { name: string };
    },
  ): HandoffResponseDto {
    const dto = new HandoffResponseDto();
    dto.id = entity.id;
    dto.fromProcessId = entity.fromListId;
    dto.fromProcessName = entity.fromList?.name;
    dto.toProcessId = entity.toListId;
    dto.toProcessName = entity.toList?.name;
    dto.triggerOnStatus = entity.triggerOnStatus;
    dto.validationRules = entity.validationRules;
    dto.autoAdvance = entity.autoAdvance;
    dto.createdAt = entity.createdAt;
    dto.updatedAt = entity.updatedAt;
    return dto;
  }
}
