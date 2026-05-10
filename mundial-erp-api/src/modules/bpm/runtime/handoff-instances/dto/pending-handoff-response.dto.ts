import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { HandoffStatus } from '@prisma/client';
import type { Prisma } from '@prisma/client';

type PendingHandoffEntity = Prisma.HandoffInstanceGetPayload<{
  include: {
    handoff: {
      include: {
        fromList: { include: { space: true } };
        toList: { include: { space: true } };
      };
    };
    order: { include: { client: true } };
  };
}>;

export class PendingHandoffResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  handoffName: string;

  @ApiProperty()
  processName: string;

  @ApiProperty()
  orderId: string;

  @ApiProperty()
  orderCode: string;

  @ApiProperty()
  clientName: string;

  @ApiProperty()
  fromDepartment: string;

  @ApiProperty()
  toDepartment: string;

  @ApiProperty({ enum: HandoffStatus })
  status: HandoffStatus;

  @ApiPropertyOptional()
  notes: string | null;

  @ApiProperty()
  createdAt: string;

  static fromEntity(entity: PendingHandoffEntity): PendingHandoffResponseDto {
    const dto = new PendingHandoffResponseDto();
    const handoff = entity.handoff;
    const fromList = handoff.fromList;
    const toList = handoff.toList;
    const order = entity.order;
    const client = order.client;

    dto.id = entity.id;
    dto.handoffName = `${fromList.name} → ${toList.name}`;
    dto.processName = fromList.name;
    dto.orderId = order.id;
    dto.orderCode = order.orderNumber;
    dto.clientName = client.name;
    dto.fromDepartment = fromList.space?.name ?? '';
    dto.toDepartment = toList.space?.name ?? '';
    dto.status = entity.status;
    dto.notes = entity.rejectionReason;
    dto.createdAt = entity.createdAt.toISOString();

    return dto;
  }
}
