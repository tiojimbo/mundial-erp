import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Automation, AutomationTrigger } from '@prisma/client';
import { Queue } from 'bullmq';
import { QUEUE_AUTOMATION_EXECUTION } from '../../queue/queue.constants';
import type { TaskEventContext } from '../events/task-events.types';
import type { AutomationJobData } from './automation.job.types';

@Injectable()
export class AutomationEngineService {
  private readonly logger = new Logger(AutomationEngineService.name);

  constructor(
    @InjectQueue(QUEUE_AUTOMATION_EXECUTION)
    private readonly queue: Queue<AutomationJobData>,
  ) {}

  async scheduleExecution(
    automation: Automation,
    trigger: AutomationTrigger,
    context: TaskEventContext,
  ): Promise<void> {
    const depth = (context.automationDepth ?? 0) + 1;
    const jobName = `${trigger}:${automation.id}`;

    await this.queue.add(
      jobName,
      {
        automationId: automation.id,
        workspaceId: automation.workspaceId,
        trigger,
        context: { ...context, automationDepth: depth },
        automationDepth: depth,
      },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: { count: 1000 },
        removeOnFail: { count: 5000 },
      },
    );

    this.logger.debug(
      `[engine] enfileirado automation=${automation.id} trigger=${trigger} ws=${automation.workspaceId} depth=${depth}`,
    );
  }
}
