import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../../database/prisma.service';
import { QUEUE_AUTOMATION_EXECUTION } from '../../queue/queue.constants';
import { AutomationsRepository } from '../automations.repository';
import { ActionRunnerService, ActionInvocation } from './action-runner.service';
import {
  Condition,
  evaluateConditions,
} from './condition-evaluator';
import type { AutomationJobData } from './automation.job.types';

export const MAX_AUTOMATION_DEPTH = 5;

@Processor(QUEUE_AUTOMATION_EXECUTION)
export class AutomationProcessor extends WorkerHost {
  private readonly logger = new Logger(AutomationProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly repository: AutomationsRepository,
    private readonly actions: ActionRunnerService,
  ) {
    super();
  }

  async process(job: Job<AutomationJobData>): Promise<void> {
    const { automationId, workspaceId, trigger, context, automationDepth } =
      job.data;

    if (automationDepth > MAX_AUTOMATION_DEPTH) {
      this.logger.warn(
        `[engine] abort automation=${automationId} depth=${automationDepth} > ${MAX_AUTOMATION_DEPTH} (loop guard)`,
      );
      return;
    }

    const automation = await this.repository.findById(workspaceId, automationId);
    if (!automation || !automation.isActive) {
      this.logger.debug(
        `[engine] skip automation=${automationId} not_active_or_missing`,
      );
      return;
    }

    const taskSnapshot = await this.loadTaskSnapshot(context.taskId);

    const conditions = Array.isArray(automation.conditions)
      ? (automation.conditions as unknown as Condition[])
      : [];
    if (!evaluateConditions(conditions, taskSnapshot)) {
      this.logger.debug(
        `[engine] conditions_not_met automation=${automationId} task=${context.taskId}`,
      );
      return;
    }

    const actions = Array.isArray(automation.compiledActions)
      ? (automation.compiledActions as unknown as ActionInvocation[])
      : [];

    for (const action of actions) {
      try {
        const result = await this.actions.run(action, context);
        if (result.status === 'error') {
          this.logger.warn(
            `[engine] action error automation=${automationId} type=${action.type} message=${result.message}`,
          );
        }
      } catch (err) {
        this.logger.error(
          `[engine] action exception automation=${automationId} type=${action.type}: ${(err as Error).message}`,
        );
        throw err;
      }
    }

    await this.repository.recordExecution(automationId, new Date());

    this.logger.log(
      `[engine] executed automation=${automationId} trigger=${trigger} task=${context.taskId} actions=${actions.length} depth=${automationDepth}`,
    );
  }

  private async loadTaskSnapshot(
    taskId: string,
  ): Promise<Record<string, unknown>> {
    const task = await this.prisma.workItem.findUnique({
      where: { id: taskId },
      select: {
        id: true,
        listId: true,
        title: true,
        statusId: true,
        priority: true,
        primaryAssigneeCache: true,
        parentId: true,
        startDate: true,
        dueDate: true,
        customTypeId: true,
        archived: true,
        tags: { select: { tagId: true } },
      },
    });
    if (!task) return {};
    return {
      ...task,
      tags: task.tags.map((t) => t.tagId),
    };
  }
}
