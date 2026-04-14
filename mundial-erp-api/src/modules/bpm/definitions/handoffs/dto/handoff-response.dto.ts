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
      fromProcess?: { name: string };
      toProcess?: { name: string };
    },
  ): HandoffResponseDto {
    const dto = new HandoffResponseDto();
    dto.id = entity.id;
    dto.fromProcessId = entity.fromProcessId;
    dto.fromProcessName = entity.fromProcess?.name;
    dto.toProcessId = entity.toProcessId;
    dto.toProcessName = entity.toProcess?.name;
    dto.triggerOnStatus = entity.triggerOnStatus;
    dto.validationRules = entity.validationRules;
    dto.autoAdvance = entity.autoAdvance;
    dto.createdAt = entity.createdAt;
    dto.updatedAt = entity.updatedAt;
    return dto;
  }
}
