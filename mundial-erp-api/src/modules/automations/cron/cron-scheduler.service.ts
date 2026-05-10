import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AutomationTrigger } from '@prisma/client';
import { parseExpression } from 'cron-parser';
import { AutomationsRepository } from '../automations.repository';
import { AutomationEngineService } from '../engine/automation-engine.service';

@Injectable()
export class CronSchedulerService {
  private readonly logger = new Logger(CronSchedulerService.name);

  constructor(
    private readonly repository: AutomationsRepository,
    private readonly engine: AutomationEngineService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async tick(): Promise<void> {
    const now = new Date();
    const due = await this.repository.findDueCronAutomations(now);
    if (due.length === 0) return;

    this.logger.log(`[cron] processando ${due.length} automation(s)`);
    for (const automation of due) {
      try {
        await this.engine.scheduleExecution(
          automation,
          AutomationTrigger.CRON,
          {
            workspaceId: automation.workspaceId,
            taskId: '',
            listId: '',
            actorUserId: null,
            automationDepth: 0,
          },
        );
        const next = this.computeNext(
          automation.cronExpression,
          automation.timezone,
        );
        await this.repository.updateNextRunAt(automation.id, next);
      } catch (err) {
        this.logger.warn(
          `[cron] falha automation=${automation.id}: ${(err as Error).message}`,
        );
      }
    }
  }

  computeNext(
    cronExpression: string | null,
    timezone: string | null,
  ): Date | null {
    if (!cronExpression) return null;
    try {
      const it = parseExpression(cronExpression, {
        tz: timezone ?? undefined,
      });
      return it.next().toDate();
    } catch {
      return null;
    }
  }
}
