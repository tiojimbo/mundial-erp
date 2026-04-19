import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_SYNC } from '../queue/queue.constants';
import { SyncService, SyncJobType } from './sync.service';

export interface SyncJobData {
  type: SyncJobType;
}

export interface SyncJobResult {
  type: SyncJobType;
  success: boolean;
  error?: string;
}

@Processor(QUEUE_SYNC)
export class SyncProcessor extends WorkerHost {
  private readonly logger = new Logger(SyncProcessor.name);

  constructor(private readonly syncService: SyncService) {
    super();
  }

  async process(job: Job<SyncJobData>): Promise<SyncJobResult> {
    const { type } = job.data;
    this.logger.log(`Sync job ${job.id} started: type=${type}`);

    const onProgress = (msg: string) => {
      this.logger.log(`[${job.id}] ${msg}`);
      void job.updateProgress({ message: msg });
    };

    try {
      switch (type) {
        case 'reference-data':
          await this.syncService.syncReferenceData(onProgress);
          break;
        case 'clients':
          await this.syncService.syncClients(onProgress);
          break;
        case 'orders':
          await this.syncService.syncOrders(onProgress);
          break;
        case 'all':
          await this.syncService.syncAll(onProgress);
          break;
        default:
          throw new Error(`Unknown sync type: ${type}`);
      }

      this.logger.log(`Sync job ${job.id} completed successfully`);
      return { type, success: true };
    } catch (error) {
      const message = (error as Error).message;
      this.logger.error(`Sync job ${job.id} failed: ${message}`);
      return { type, success: false, error: message };
    }
  }
}
