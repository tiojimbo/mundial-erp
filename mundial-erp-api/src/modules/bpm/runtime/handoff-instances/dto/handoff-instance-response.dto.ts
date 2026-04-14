import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { HandoffInstance, HandoffStatus } from '@prisma/client';

export class HandoffInstanceResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  handoffId: string;

  @ApiProperty()
  orderId: string;

  @ApiProperty()
  fromProcessInstanceId: string;

  @ApiPropertyOptional()
  toProcessInstanceId: string | null;

  @ApiProperty({ enum: HandoffStatus })
  status: HandoffStatus;

  @ApiPropertyOptional()
  rejectionReason: string | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  static fromEntity(entity: HandoffInstance): HandoffInstanceResponseDto {
    const dto = new HandoffInstanceResponseDto();
    dto.id = entity.id;
    dto.handoffId = entity.handoffId;
    dto.orderId = entity.orderId;
    dto.fromProcessInstanceId = entity.fromProcessInstanceId;
    dto.toProcessInstanceId = entity.toProcessInstanceId;
    dto.status = entity.status;
    dto.rejectionReason = entity.rejectionReason;
    dto.createdAt = entity.createdAt;
    dto.updatedAt = entity.updatedAt;
    return dto;
  }
}
