import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';

const ORDER_TASK_TYPE_NAME = 'pedido';
const ORDER_CODE_FIELD_KEY = 'order_code';

@Injectable()
export class OrderCodeService {
  private readonly logger = new Logger(OrderCodeService.name);

  async fillOnCreate(
    tx: Prisma.TransactionClient,
    input: {
      taskId: string;
      workspaceId: string;
      customTypeId: string | null;
    },
  ): Promise<void> {
    const { taskId, workspaceId, customTypeId } = input;
    if (!customTypeId) return;

    const taskType = await tx.customTaskType.findUnique({
      where: { id: customTypeId },
      select: { name: true, deletedAt: true },
    });
    if (!taskType || taskType.deletedAt) return;
    if (taskType.name.trim().toLowerCase() !== ORDER_TASK_TYPE_NAME) return;

    const definition = await tx.customFieldDefinition.findFirst({
      where: {
        key: ORDER_CODE_FIELD_KEY,
        fillMethod: 'computed',
        deletedAt: null,
        OR: [{ workspaceId }, { workspaceId: null }],
      },
      select: { id: true },
    });
    if (!definition) return;

    const existing = await tx.customFieldValue.findUnique({
      where: {
        workItemId_definitionId: {
          workItemId: taskId,
          definitionId: definition.id,
        },
      },
      select: { id: true },
    });
    if (existing) return;

    const sequence = await tx.orderCodeSequence.upsert({
      where: { workspaceId },
      create: { workspaceId, lastNumber: 1 },
      update: { lastNumber: { increment: 1 } },
      select: { lastNumber: true },
    });

    await tx.customFieldValue.create({
      data: {
        workItemId: taskId,
        definitionId: definition.id,
        valueNumber: new Prisma.Decimal(sequence.lastNumber),
      },
    });

    this.logger.log(
      `order-code.filled task=${taskId} ws=${workspaceId} code=${sequence.lastNumber}`,
    );
  }
}
