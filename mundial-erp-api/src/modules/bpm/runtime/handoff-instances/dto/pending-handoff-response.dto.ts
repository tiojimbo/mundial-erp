import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { HandoffStatus } from '@prisma/client';
import type { Prisma } from '@prisma/client';

type PendingHandoffEntity = Prisma.HandoffInstanceGetPayload<{
  include: {
    handoff: {
      include: {
        fromProcess: { include: { department: true } };
        toProcess: { include: { department: true } };
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
    const fromProcess = handoff.fromProcess;
    const toProcess = handoff.toProcess;
    const order = entity.order;
    const client = order.client;

    dto.id = entity.id;
    dto.handoffName = `${fromProcess.name} → ${toProcess.name}`;
    dto.processName = fromProcess.name;
    dto.orderId = order.id;
    dto.orderCode = order.orderNumber;
    dto.clientName = client.name;
    dto.fromDepartment = fromProcess.department?.name ?? '';
    dto.toDepartment = toProcess.department?.name ?? '';
    dto.status = entity.status;
    dto.notes = entity.rejectionReason;
    dto.createdAt = entity.createdAt.toISOString();

    return dto;
  }
}
