import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ActivityStatus, TaskStatus } from '@prisma/client';
import type { Prisma } from '@prisma/client';

type DailyActivityEntity = Prisma.ActivityInstanceGetPayload<{
  include: {
    activity: {
      include: {
        process: {
          include: { department: true };
        };
      };
    };
    processInstance: {
      include: {
        order: { include: { client: true } };
      };
    };
    taskInstances: true;
  };
}>;

export class DailyActivityResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  activityName: string;

  @ApiProperty()
  processName: string;

  @ApiProperty()
  orderId: string;

  @ApiProperty()
  orderCode: string;

  @ApiProperty()
  clientName: string;

  @ApiProperty()
  assignedUserId: string;

  @ApiProperty({ enum: ActivityStatus })
  status: ActivityStatus;

  @ApiPropertyOptional()
  dueAt: string | null;

  @ApiPropertyOptional()
  startedAt: string | null;

  @ApiPropertyOptional()
  completedAt: string | null;

  @ApiProperty()
  slaMinutes: number;

  @ApiProperty()
  slaRemainingMinutes: number;

  @ApiProperty()
  checklistTotal: number;

  @ApiProperty()
  checklistCompleted: number;

  @ApiProperty()
  createdAt: string;

  static fromEntity(entity: DailyActivityEntity): DailyActivityResponseDto {
    const dto = new DailyActivityResponseDto();
    const activity = entity.activity;
    const process = activity.process;
    const order = entity.processInstance.order;
    const client = order.client;
    const tasks = entity.taskInstances;
    const slaMinutes = activity.slaMinutes ?? 0;

    let slaRemainingMinutes = slaMinutes;
    if (slaMinutes > 0 && entity.startedAt) {
      const elapsed = Math.floor(
        (Date.now() - entity.startedAt.getTime()) / 60000,
      );
      slaRemainingMinutes = Math.max(0, slaMinutes - elapsed);
    }

    dto.id = entity.id;
    dto.activityName = activity.name;
    dto.processName = process.name;
    dto.orderId = order.id;
    dto.orderCode = order.orderNumber;
    dto.clientName = client.name;
    dto.assignedUserId = entity.assignedUserId ?? '';
    dto.status = entity.status;
    dto.dueAt = entity.dueAt?.toISOString() ?? null;
    dto.startedAt = entity.startedAt?.toISOString() ?? null;
    dto.completedAt = entity.completedAt?.toISOString() ?? null;
    dto.slaMinutes = slaMinutes;
    dto.slaRemainingMinutes = slaRemainingMinutes;
    dto.checklistTotal = tasks.length;
    dto.checklistCompleted = tasks.filter(
      (t) => t.status === TaskStatus.DONE,
    ).length;
    dto.createdAt = entity.createdAt.toISOString();

    return dto;
  }
}
