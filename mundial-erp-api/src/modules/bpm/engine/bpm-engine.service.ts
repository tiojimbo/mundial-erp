import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  OrderStatus,
  ProcessStatus,
  ActivityStatus,
  TaskStatus,
  HandoffStatus,
} from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';

export interface OrderStatusChangedEvent {
  orderId: string;
  fromStatus: OrderStatus;
  toStatus: OrderStatus;
  userId: string;
}

@Injectable()
export class BpmEngineService {
  private readonly logger = new Logger(BpmEngineService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  @OnEvent('order.status.changed')
  async handleOrderStatusChange(event: OrderStatusChangedEvent): Promise<void> {
    const { orderId, fromStatus, toStatus, userId } = event;

    this.logger.log(
      `Order ${orderId} status changed: ${fromStatus} -> ${toStatus}`,
    );

    try {
      await this.processActivities(orderId, toStatus, userId);
      await this.processHandoffs(orderId, toStatus);
    } catch (error) {
      this.logger.error(
        `Failed to process BPM for order ${orderId} (${fromStatus} -> ${toStatus}): ${
          error instanceof Error ? error.message : String(error)
        }`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  // -------------------------------------------------------------------------
  // Activities: find triggered activities, create instances + task checklist
  // -------------------------------------------------------------------------

  private async processActivities(
    orderId: string,
    toStatus: OrderStatus,
    userId: string,
  ): Promise<void> {
    const activities = await this.prisma.activity.findMany({
      where: { triggerOnStatus: toStatus, deletedAt: null },
      include: { tasks: { where: { deletedAt: null } } },
    });

    if (activities.length === 0) {
      this.logger.debug(`No activities triggered for status ${toStatus}`);
      return;
    }

    this.logger.log(
      `Found ${activities.length} activity(ies) triggered by status ${toStatus}`,
    );

    for (const activity of activities) {
      try {
        const processInstance = await this.findOrCreateProcessInstance(
          activity.processId,
          orderId,
        );

        // W2: Idempotency — skip if ActivityInstance already exists for this
        // activity + processInstance combo (prevents duplicates on event retry)
        const existingAI = await this.prisma.activityInstance.findFirst({
          where: {
            activityId: activity.id,
            processInstanceId: processInstance.id,
            deletedAt: null,
          },
        });

        if (existingAI) {
          this.logger.warn(
            `ActivityInstance already exists for activity ${activity.id} ` +
              `on processInstance ${processInstance.id}. Skipping (idempotent).`,
          );
          continue;
        }

        const dueAt = activity.slaMinutes
          ? new Date(Date.now() + activity.slaMinutes * 60_000)
          : null;

        // W1: Transaction — create ActivityInstance + TaskInstances atomically
        const activityInstance = await this.prisma.$transaction(async (tx) => {
          const ai = await tx.activityInstance.create({
            data: {
              activityId: activity.id,
              processInstanceId: processInstance.id,
              status: ActivityStatus.PENDING,
              dueAt,
            },
          });

          if (activity.tasks.length > 0) {
            await tx.taskInstance.createMany({
              data: activity.tasks.map((task) => ({
                taskId: task.id,
                activityInstanceId: ai.id,
                status: TaskStatus.PENDING,
              })),
            });
          }

          return ai;
        });

        this.logger.log(
          `Created ActivityInstance ${activityInstance.id} for activity "${activity.name}" ` +
            `(${activity.tasks.length} tasks)`,
        );

        this.eventEmitter.emit('bpm.activity.created', {
          activityInstanceId: activityInstance.id,
          activityId: activity.id,
          processInstanceId: processInstance.id,
          orderId,
        });
      } catch (error) {
        this.logger.error(
          `Failed to create ActivityInstance for activity ${activity.id} ` +
            `(order ${orderId}): ${error instanceof Error ? error.message : String(error)}`,
          error instanceof Error ? error.stack : undefined,
        );
      }
    }
  }

  // -------------------------------------------------------------------------
  // Handoffs: find triggered handoffs, optionally auto-advance
  // -------------------------------------------------------------------------

  private async processHandoffs(
    orderId: string,
    toStatus: OrderStatus,
  ): Promise<void> {
    const handoffs = await this.prisma.handoff.findMany({
      where: { triggerOnStatus: toStatus, deletedAt: null },
    });

    if (handoffs.length === 0) {
      this.logger.debug(`No handoffs triggered for status ${toStatus}`);
      return;
    }

    this.logger.log(
      `Found ${handoffs.length} handoff(s) triggered by status ${toStatus}`,
    );

    for (const handoff of handoffs) {
      try {
        const sourceProcessInstance =
          await this.prisma.processInstance.findFirst({
            where: {
              processId: handoff.fromProcessId,
              orderId,
              deletedAt: null,
            },
          });

        if (!sourceProcessInstance) {
          this.logger.warn(
            `Source ProcessInstance not found for handoff ${handoff.id} ` +
              `(processId=${handoff.fromProcessId}, orderId=${orderId}). Skipping.`,
          );
          continue;
        }

        // W2: Idempotency — skip if HandoffInstance already exists
        const existingHI = await this.prisma.handoffInstance.findFirst({
          where: {
            handoffId: handoff.id,
            orderId,
            fromProcessInstanceId: sourceProcessInstance.id,
            deletedAt: null,
          },
        });

        if (existingHI) {
          this.logger.warn(
            `HandoffInstance already exists for handoff ${handoff.id} ` +
              `on order ${orderId}. Skipping (idempotent).`,
          );
          continue;
        }

        let toProcessInstanceId: string | null = null;

        if (handoff.autoAdvance) {
          const destProcessInstance = await this.findOrCreateProcessInstance(
            handoff.toProcessId,
            orderId,
          );
          toProcessInstanceId = destProcessInstance.id;
        }

        const handoffInstance = await this.prisma.handoffInstance.create({
          data: {
            handoffId: handoff.id,
            orderId,
            fromProcessInstanceId: sourceProcessInstance.id,
            toProcessInstanceId,
            status: handoff.autoAdvance
              ? HandoffStatus.ACCEPTED
              : HandoffStatus.PENDING,
          },
        });

        this.logger.log(
          `Created HandoffInstance ${handoffInstance.id} (status=${handoffInstance.status}) ` +
            `for handoff ${handoff.fromProcessId} -> ${handoff.toProcessId}`,
        );

        this.eventEmitter.emit('bpm.handoff.created', {
          handoffInstanceId: handoffInstance.id,
          handoffId: handoff.id,
          orderId,
          autoAdvanced: handoff.autoAdvance,
        });
      } catch (error) {
        this.logger.error(
          `Failed to create HandoffInstance for handoff ${handoff.id} ` +
            `(order ${orderId}): ${error instanceof Error ? error.message : String(error)}`,
          error instanceof Error ? error.stack : undefined,
        );
      }
    }
  }

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  /**
   * C2: Find-or-create with retry to handle race conditions.
   * Uses try/catch around create to handle concurrent inserts gracefully.
   */
  private async findOrCreateProcessInstance(
    processId: string,
    orderId: string,
  ) {
    const existing = await this.prisma.processInstance.findFirst({
      where: { processId, orderId, deletedAt: null },
    });

    if (existing) {
      return existing;
    }

    try {
      const created = await this.prisma.processInstance.create({
        data: {
          processId,
          orderId,
          status: ProcessStatus.ACTIVE,
          startedAt: new Date(),
        },
      });

      this.logger.log(
        `Created ProcessInstance ${created.id} for process ${processId}, order ${orderId}`,
      );

      return created;
    } catch (error) {
      // Race condition: another concurrent call created it between our
      // findFirst and create. Try to find it again.
      const retryFind = await this.prisma.processInstance.findFirst({
        where: { processId, orderId, deletedAt: null },
      });

      if (retryFind) {
        this.logger.debug(
          `ProcessInstance for process ${processId}, order ${orderId} ` +
            `created by concurrent call. Using existing ${retryFind.id}.`,
        );
        return retryFind;
      }

      // If still not found, it's a real error — rethrow
      throw error;
    }
  }
}
