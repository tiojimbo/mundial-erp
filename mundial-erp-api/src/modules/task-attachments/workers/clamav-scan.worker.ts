/**
 * ClamAvScanWorker (real, Sprint 4)
 *
 * Consome a fila `clamav-scan`. Para cada anexo:
 *   1) Baixa o objeto do S3/MinIO em stream para `/tmp/scan-${uuid()}`.
 *   2) Executa scan ClamAV daemon via `clamscan` (NodeClam.isInfected).
 *   3) Atualiza WorkItemAttachment.scanStatus CLEAN | INFECTED | ERROR.
 *   4) Em INFECTED cria Notification (Security) para o uploader.
 *   5) Em erro/timeout, re-joga — BullMQ faz retry (attempts 5, backoff 30s).
 *   6) Apos ultima tentativa (5ª): scanStatus=ERROR + log ERROR p/ Grafana.
 *
 * Concorrencia: 3 (CLAMAV_SCAN_CONCURRENCY).
 * Timeout por scan: 60s (CLAMAV_SCAN_TIMEOUT_MS).
 *
 * Env:
 *   - CLAMAV_HOST (default: clamav)
 *   - CLAMAV_PORT (default: 3310)
 */
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Job } from 'bullmq';
import NodeClam from 'clamscan';
import { promises as fs, createWriteStream } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import {
  NotificationCategory,
  NotificationType,
} from '@prisma/client';
import { TaskAttachmentsRepository } from '../task-attachments.repository';
import { S3AdapterService } from '../../../common/adapters/s3-adapter.service';
import { NotificationsService } from '../../notifications/notifications.service';
import {
  CLAMAV_SCAN_CONCURRENCY,
  CLAMAV_SCAN_MAX_ATTEMPTS,
  CLAMAV_SCAN_QUEUE,
  CLAMAV_SCAN_TIMEOUT_MS,
  type ClamAvScanJobData,
} from './clamav-scan.constants';

type ScanResult = { status: 'CLEAN' | 'INFECTED' | 'ERROR'; threat?: string };

@Processor(CLAMAV_SCAN_QUEUE, { concurrency: CLAMAV_SCAN_CONCURRENCY })
@Injectable()
export class ClamAvScanWorker extends WorkerHost implements OnModuleInit {
  private readonly logger = new Logger(ClamAvScanWorker.name);
  private clam: NodeClam | null = null;
  private clamInitPromise: Promise<NodeClam> | null = null;

  constructor(
    private readonly repository: TaskAttachmentsRepository,
    private readonly s3: S3AdapterService,
    private readonly notifications: NotificationsService,
  ) {
    super();
  }

  async onModuleInit(): Promise<void> {
    // Inicializacao lazy — permite subir a API mesmo sem ClamAV disponivel
    // (erro aparece so no primeiro scan).
    this.clamInitPromise = this.initClam();
    // Evita unhandledRejection quando ClamAV esta offline no boot: o primeiro
    // scan repete initClam via getClam(). Sem esse handler, a promise rejeitada
    // abandonada derruba o processo Node.
    this.clamInitPromise.catch((err) => {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`clamav.init-deferred: ${msg}`);
      this.clamInitPromise = null;
    });
  }

  private async initClam(): Promise<NodeClam> {
    const host = process.env.CLAMAV_HOST ?? 'clamav';
    const port = Number.parseInt(process.env.CLAMAV_PORT ?? '3310', 10);
    const instance = await new NodeClam().init({
      clamdscan: {
        host,
        port,
        timeout: CLAMAV_SCAN_TIMEOUT_MS,
        local_fallback: false,
      },
      preference: 'clamdscan',
    });
    this.clam = instance;
    this.logger.log(`clamav.init host=${host} port=${port}`);
    return instance;
  }

  private async getClam(): Promise<NodeClam> {
    if (this.clam) return this.clam;
    if (!this.clamInitPromise) {
      this.clamInitPromise = this.initClam();
    }
    return this.clamInitPromise;
  }

  async process(job: Job<ClamAvScanJobData>): Promise<void> {
    const { attachmentId, storageKey } = job.data;
    const attempt = job.attemptsMade + 1;
    const maxAttempts = job.opts.attempts ?? CLAMAV_SCAN_MAX_ATTEMPTS;
    this.logger.log(
      `clamav-scan.start id=${attachmentId} key=${storageKey} attempt=${attempt}/${maxAttempts}`,
    );

    const tmpPath = join(tmpdir(), `scan-${randomUUID()}`);
    try {
      await this.downloadToTmp(storageKey, tmpPath);
      const result = await this.runScanWithTimeout(tmpPath);
      await this.repository.updateScanStatus(attachmentId, result.status);

      if (result.status === 'INFECTED') {
        await this.handleInfected(attachmentId, result.threat ?? 'unknown');
      }

      this.logger.log(
        `clamav-scan.done id=${attachmentId} status=${result.status}`,
      );
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `clamav-scan.error id=${attachmentId} attempt=${attempt}/${maxAttempts}: ${msg}`,
      );
      if (attempt >= maxAttempts) {
        // Ultima tentativa — marca ERROR + log agregavel por Grafana/Loki.
        await this.repository.updateScanStatus(attachmentId, 'ERROR');
        this.logger.error(
          `clamav-scan.final-error id=${attachmentId} alert=grafana reason=${msg}`,
        );
      }
      throw error;
    } finally {
      await this.safeUnlink(tmpPath);
    }
  }

  private async downloadToTmp(
    storageKey: string,
    tmpPath: string,
  ): Promise<void> {
    const stream = await this.s3.downloadAsStream(storageKey);
    const write = createWriteStream(tmpPath);
    await pipeline(stream, write);
  }

  private async runScanWithTimeout(tmpPath: string): Promise<ScanResult> {
    const clam = await this.getClam();
    const scanPromise: Promise<ScanResult> = clam
      .isInfected(tmpPath)
      .then((res): ScanResult => {
        if (res.isInfected) {
          const viruses = Array.isArray(res.viruses) ? res.viruses : [];
          return {
            status: 'INFECTED',
            threat: viruses.join(',') || 'unknown',
          };
        }
        return { status: 'CLEAN' };
      });

    const timeoutPromise = new Promise<ScanResult>((_, reject) => {
      const t = setTimeout(
        () =>
          reject(
            new Error(`clamav.timeout after ${CLAMAV_SCAN_TIMEOUT_MS}ms`),
          ),
        CLAMAV_SCAN_TIMEOUT_MS,
      );
      t.unref?.();
    });

    return Promise.race([scanPromise, timeoutPromise]);
  }

  private async safeUnlink(path: string): Promise<void> {
    try {
      await fs.unlink(path);
    } catch (error) {
      // Se o arquivo nao existe, ignore; outros erros logam warn.
      const err = error as NodeJS.ErrnoException;
      if (err.code !== 'ENOENT') {
        this.logger.warn(
          `clamav-scan.unlink-failed path=${path} err=${err.message}`,
        );
      }
    }
  }

  private async handleInfected(
    attachmentId: string,
    threat: string,
  ): Promise<void> {
    this.logger.warn(
      `clamav-scan.infected id=${attachmentId} threat=${threat}`,
    );
    try {
      const row = await this.repository.findByIdUnscoped(attachmentId);
      if (!row) return;
      await this.notifications.create({
        userId: row.uploadedBy,
        type: NotificationType.SYSTEM,
        category: NotificationCategory.PRIMARY,
        title: 'Anexo bloqueado por seguranca',
        description: `O arquivo "${row.filename}" foi marcado como INFECTED (${threat}) e nao pode ser baixado.`,
        entityId: attachmentId,
        entityUrl: `/tasks/${row.workItemId}`,
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`clamav-scan.notify-failed id=${attachmentId}: ${msg}`);
    }
  }
}
