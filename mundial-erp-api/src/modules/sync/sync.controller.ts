import {
  Controller,
  Post,
  Get,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { SyncEntity, SyncLog } from '@prisma/client';
import { QUEUE_SYNC } from '../queue/queue.constants';
import { ProFinancasClientService } from './pro-financas/pro-financas-client.service';
import { SyncLogRepository } from './repositories/sync-log.repository';
import { SyncLogsQueryDto } from './dto/sync-request.dto';
import {
  SyncJobResponseDto,
  SyncStatusResponseDto,
  SyncJobStatusResponseDto,
} from './dto/sync-response.dto';
import { SyncJobData } from './sync.processor';

@ApiTags('Sync')
@Controller('sync')
export class SyncController {
  constructor(
    @InjectQueue(QUEUE_SYNC) private readonly syncQueue: Queue<SyncJobData>,
    private readonly pfClient: ProFinancasClientService,
    private readonly syncLogRepo: SyncLogRepository,
  ) {}

  // ── POST endpoints (enqueue sync jobs) ────────────────────────────────

  @Post('clients')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Enqueue client sync from Pro Finanças' })
  @ApiResponse({ status: 202, type: SyncJobResponseDto })
  async syncClients(): Promise<SyncJobResponseDto> {
    this.ensureConfigured();
    const job = await this.syncQueue.add('sync-clients', { type: 'clients' });
    return { jobId: job.id!, message: 'Client sync enqueued' };
  }

  @Post('orders')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Enqueue order sync from Pro Finanças' })
  @ApiResponse({ status: 202, type: SyncJobResponseDto })
  async syncOrders(): Promise<SyncJobResponseDto> {
    this.ensureConfigured();
    const job = await this.syncQueue.add('sync-orders', { type: 'orders' });
    return { jobId: job.id!, message: 'Order sync enqueued' };
  }

  @Post('reference-data')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Enqueue reference data sync (companies, carriers, payment methods, etc.)' })
  @ApiResponse({ status: 202, type: SyncJobResponseDto })
  async syncReferenceData(): Promise<SyncJobResponseDto> {
    this.ensureConfigured();
    const job = await this.syncQueue.add('sync-reference-data', {
      type: 'reference-data',
    });
    return { jobId: job.id!, message: 'Reference data sync enqueued' };
  }

  @Post('all')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Enqueue full sync in dependency order: reference-data → clients → orders' })
  @ApiResponse({ status: 202, type: SyncJobResponseDto })
  async syncAll(): Promise<SyncJobResponseDto> {
    this.ensureConfigured();
    const job = await this.syncQueue.add('sync-all', { type: 'all' });
    return { jobId: job.id!, message: 'Full sync enqueued' };
  }

  // ── GET endpoints (query status) ──────────────────────────────────────

  @Get('logs')
  @ApiOperation({ summary: 'Sync history logs' })
  async getLogs(@Query() query: SyncLogsQueryDto) {
    return this.syncLogRepo.findMany({
      skip: query.skip ? Number(query.skip) : 0,
      take: query.take ? Number(query.take) : 20,
      entity: query.entity,
    });
  }

  @Get('status')
  @ApiOperation({ summary: 'Integration health + queue status' })
  @ApiResponse({ status: 200, type: SyncStatusResponseDto })
  async getStatus(): Promise<SyncStatusResponseDto> {
    const entities = Object.values(SyncEntity);
    const lastSyncPerEntity: Record<string, SyncLog | null> = {};

    for (const entity of entities) {
      lastSyncPerEntity[entity] = await this.syncLogRepo.getLatestByEntity(entity);
    }

    const [waiting, active] = await Promise.all([
      this.syncQueue.getWaitingCount(),
      this.syncQueue.getActiveCount(),
    ]);

    return {
      configured: this.pfClient.isConfigured(),
      circuitBreakerOpen: false, // exposed for monitoring
      lastSyncPerEntity,
      queuedJobs: waiting,
      activeJobs: active,
    };
  }

  @Get('jobs/:jobId')
  @ApiOperation({ summary: 'Status of a specific sync job' })
  @ApiResponse({ status: 200, type: SyncJobStatusResponseDto })
  async getJobStatus(@Param('jobId') jobId: string): Promise<SyncJobStatusResponseDto> {
    const job = await this.syncQueue.getJob(jobId);
    if (!job) {
      throw new BadRequestException(`Job ${jobId} not found`);
    }

    const state = await job.getState();
    return {
      jobId: job.id!,
      state,
      progress: job.progress as number | object,
      result: job.returnvalue,
      failedReason: job.failedReason,
    };
  }

  // ── Helpers ───────────────────────────────────────────────────────────

  private ensureConfigured(): void {
    if (!this.pfClient.isConfigured()) {
      throw new BadRequestException(
        'Pro Finanças integration not configured. Set PRO_FINANCAS_URL, PRO_FINANCAS_EMAIL, and PRO_FINANCAS_PASSWORD environment variables.',
      );
    }
  }
}
