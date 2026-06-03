import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  Optional,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Interval } from '@nestjs/schedule';
import { Queue } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import { TaskOutboxRepository } from './task-outbox.repository';
import {
  POLL_BATCH_SIZE,
  POLL_INTERVAL_MS,
  POLL_MIN_AGE_MS,
  QUEUE_TASK_OUTBOX,
} from './task-outbox.constants';
import type { OutboxJobData } from './task-outbox.service';

interface DrainResult {
  republished: number;
  skipped: number;
  durationMs: number;
}

@Injectable()
export class TaskOutboxPollerService implements OnApplicationBootstrap {
  private readonly logger = new Logger(TaskOutboxPollerService.name);

  constructor(
    private readonly repo: TaskOutboxRepository,
    @Optional()
    @InjectQueue(QUEUE_TASK_OUTBOX)
    private readonly queue?: Queue<OutboxJobData>,
    @Optional()
    private readonly config?: ConfigService,
  ) {}

  private isEnabled(): boolean {
    return this.config?.get<string>('TASKS_OUTBOX_POLLER_ENABLED') === 'true';
  }

  async onApplicationBootstrap(): Promise<void> {
    if (!this.isEnabled()) {
      this.logger.warn(
        'task-outbox poller DESABILITADO (TASKS_OUTBOX_POLLER_ENABLED != true); pulando drain no boot.',
      );
      return;
    }
    await this.drainStuck();
  }

  @Interval('task-outbox-poller', POLL_INTERVAL_MS)
  async poll(): Promise<void> {
    if (!this.isEnabled()) return;
    await this.drainStuck();
  }

  async drainStuck(): Promise<DrainResult> {
    const startedAt = Date.now();
    if (!this.queue) {
      this.logger.warn(
        'task-outbox poller: BullMQ queue indisponível; nada a republicar.',
      );
      return { republished: 0, skipped: 0, durationMs: 0 };
    }

    const rows = await this.repo.findStuckForRepublish(
      POLL_BATCH_SIZE,
      POLL_MIN_AGE_MS,
    );

    let republished = 0;
    let skipped = 0;
    for (const row of rows) {
      try {
        await this.queue.add(
          row.eventType,
          { eventId: row.id },
          {
            jobId: row.id,
            removeOnComplete: 1_000,
            removeOnFail: 5_000,
          },
        );
        republished += 1;
      } catch (err) {
        skipped += 1;
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.warn(
          `task-outbox poller: falha ao republicar eventId=${row.id}: ${msg}`,
        );
      }
    }

    const durationMs = Date.now() - startedAt;
    if (republished > 0 || skipped > 0) {
      this.logger.log({
        message: 'task-outbox poller drained',
        republished,
        skipped,
        durationMs,
      });
    }
    return { republished, skipped, durationMs };
  }
}
