/**
 * TaskAttachmentsService (TSK-405, PLANO §8.10)
 *
 * Fluxo de upload (3 etapas):
 *   1. POST /tasks/:id/attachments/signed-url
 *      -> valida MIME + size, gera storageKey + signed PUT (TTL 300s).
 *   2. Cliente faz PUT direto no bucket privado `tasks-attachments`.
 *   3. POST /tasks/:id/attachments com storageKey
 *      -> cria row PENDING e enfileira `clamav-scan`.
 *
 * Download so libera URL GET quando scanStatus=CLEAN. Infected => 403.
 */
import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { randomUUID } from 'node:crypto';
import { Role } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { TaskAttachmentsRepository } from './task-attachments.repository';
import { S3AdapterService } from '../../common/adapters/s3-adapter.service';
import { FileTypeDetectorService } from '../../common/adapters/file-type-detector.service';
import { TaskOutboxService } from '../task-outbox/task-outbox.service';
import {
  ATTACHMENT_MAX_SIZE_BYTES,
  ATTACHMENT_MIME_WHITELIST_REGEX,
  SignedUrlRequestDto,
} from './dtos/signed-url-request.dto';
import { RegisterAttachmentDto } from './dtos/register-attachment.dto';
import {
  AttachmentResponseDto,
  DownloadUrlResponseDto,
  SignedUrlResponseDto,
  type AttachmentShape,
} from './dtos/attachment-response.dto';
import {
  CLAMAV_SCAN_QUEUE,
  type ClamAvScanJobData,
} from './workers/clamav-scan.constants';

const SIGNED_URL_TTL_SECONDS = 300;
const OUTBOX_ATTACHMENT_ADDED = 'ATTACHMENT_ADDED' as const;
const ROLES_MAY_DELETE: ReadonlySet<Role> = new Set<Role>([
  Role.ADMIN,
  Role.MANAGER,
]);

function sanitizeFilename(input: string): string {
  // remove caminhos/barras, limita a [a-zA-Z0-9._-], corta a 128 chars.
  const base = input.replace(/[\\/]+/g, '_');
  return base.replace(/[^\w.\-]+/g, '_').slice(0, 128) || 'file';
}

@Injectable()
export class TaskAttachmentsService {
  private readonly logger = new Logger(TaskAttachmentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly repository: TaskAttachmentsRepository,
    private readonly s3: S3AdapterService,
    private readonly fileTypeDetector: FileTypeDetectorService,
    @Inject(forwardRef(() => TaskOutboxService))
    private readonly outbox: TaskOutboxService,
    @InjectQueue(CLAMAV_SCAN_QUEUE)
    private readonly scanQueue: Queue<ClamAvScanJobData>,
  ) {}

  async createSignedUrl(
    workspaceId: string,
    taskId: string,
    dto: SignedUrlRequestDto,
  ): Promise<SignedUrlResponseDto> {
    const task = await this.repository.findTaskInWorkspace(workspaceId, taskId);
    if (!task) {
      throw new NotFoundException('Tarefa nao encontrada');
    }
    // Validacao defensiva alem do DTO — nunca confie so no decorator.
    // Validacao de input => 400, nao 403 (agent-cto: 403 e para permissao negada).
    if (!ATTACHMENT_MIME_WHITELIST_REGEX.test(dto.mimeType)) {
      throw new BadRequestException('mimeType fora da whitelist');
    }
    if (dto.sizeBytes <= 0 || dto.sizeBytes > ATTACHMENT_MAX_SIZE_BYTES) {
      throw new BadRequestException('sizeBytes fora do limite (25MB)');
    }

    const sanitized = sanitizeFilename(dto.filename);
    const storageKey = `${workspaceId}/${taskId}/${randomUUID()}-${sanitized}`;

    const signed = await this.s3.getSignedPutUrl({
      key: storageKey,
      contentType: dto.mimeType,
      contentLength: dto.sizeBytes,
      expiresInSeconds: SIGNED_URL_TTL_SECONDS,
    });

    this.logger.log(
      // Nao logar URL completa — expira em 300s mas ainda e credencial.
      `attachments.signed-url workspace=${workspaceId} task=${taskId} key=${storageKey} ttl=${SIGNED_URL_TTL_SECONDS}s`,
    );

    const response = new SignedUrlResponseDto();
    response.url = signed.url;
    response.storageKey = storageKey;
    response.expiresAt = signed.expiresAt;
    return response;
  }

  async register(
    workspaceId: string,
    taskId: string,
    dto: RegisterAttachmentDto,
    actorUserId: string,
  ): Promise<AttachmentResponseDto> {
    const task = await this.repository.findTaskInWorkspace(workspaceId, taskId);
    if (!task) {
      throw new NotFoundException('Tarefa nao encontrada');
    }

    // Anti-tamper: storageKey deve comecar com `${workspaceId}/${taskId}/`.
    // Validacao de input => 400 (payload invalido), nao 403.
    const expectedPrefix = `${workspaceId}/${taskId}/`;
    if (!dto.storageKey.startsWith(expectedPrefix)) {
      throw new BadRequestException('storageKey invalido para este escopo');
    }

    // PLANO §8.10 — MIME magic number check (double-check lado server).
    // Se divergir, file-type-detector lanca MimeMismatchException (400).
    await this.fileTypeDetector.detectMimeFromStorage(
      dto.storageKey,
      dto.mimeType,
    );

    // Insert + outbox enqueue em $transaction unica (ADR-003). O enqueue do
    // scan na fila BullMQ fica FORA da tx — workers externos nao compartilham
    // o tx do Prisma, e o attachment precisa ja estar commitado para ser
    // buscavel pelo worker do ClamAV.
    const created = await this.prisma.$transaction(async (tx) => {
      const row = await this.repository.create(
        {
          workItemId: taskId,
          filename: dto.filename,
          mimeType: dto.mimeType,
          sizeBytes: dto.sizeBytes,
          storageKey: dto.storageKey,
          uploadedBy: actorUserId,
        },
        tx,
      );
      // Emite outbox — worker do outbox cria WorkItemActivity (ADR-002).
      await this.outbox.enqueue(tx, {
        aggregateId: taskId,
        eventType: OUTBOX_ATTACHMENT_ADDED,
        payload: {
          taskId,
          attachmentId: row.id,
          filename: dto.filename,
          mimeType: dto.mimeType,
          sizeBytes: dto.sizeBytes,
          actorId: actorUserId,
        },
        workspaceId,
      });
      return row;
    });

    // Enfileira scan async apos o commit.
    await this.scanQueue.add(
      'scan',
      { attachmentId: created.id, storageKey: created.storageKey },
      {
        jobId: `scan:${created.id}`,
        attempts: 5,
        backoff: { type: 'fixed', delay: 30_000 },
        removeOnComplete: 1_000,
        removeOnFail: 5_000,
      },
    );

    return AttachmentResponseDto.fromEntity(
      created as unknown as AttachmentShape,
    );
  }

  async findByTask(
    workspaceId: string,
    taskId: string,
  ): Promise<AttachmentResponseDto[]> {
    const task = await this.repository.findTaskInWorkspace(workspaceId, taskId);
    if (!task) {
      throw new NotFoundException('Tarefa nao encontrada');
    }
    const rows = await this.repository.findByTask(workspaceId, taskId);
    return rows.map((r) =>
      AttachmentResponseDto.fromEntity(r as unknown as AttachmentShape),
    );
  }

  async getDownloadUrl(
    workspaceId: string,
    id: string,
  ): Promise<DownloadUrlResponseDto> {
    const row = await this.repository.findById(workspaceId, id);
    if (!row) {
      throw new NotFoundException('Anexo nao encontrado');
    }
    if (row.scanStatus !== 'CLEAN') {
      // Bloqueia download enquanto scan nao liberar (§8.10).
      throw new ForbiddenException(
        `Download bloqueado: scanStatus=${row.scanStatus}`,
      );
    }
    const signed = await this.s3.getSignedGetUrl({
      key: row.storageKey,
      expiresInSeconds: SIGNED_URL_TTL_SECONDS,
      downloadFilename: row.filename,
    });
    const response = new DownloadUrlResponseDto();
    response.url = signed.url;
    response.expiresAt = signed.expiresAt;
    return response;
  }

  async remove(
    workspaceId: string,
    id: string,
    actor: { userId: string; role: Role },
  ): Promise<void> {
    if (!ROLES_MAY_DELETE.has(actor.role)) {
      throw new ForbiddenException('Apenas Manager ou Admin podem remover');
    }
    const row = await this.repository.findById(workspaceId, id);
    if (!row) {
      throw new NotFoundException('Anexo nao encontrado');
    }
    await this.repository.softDelete(id);
    try {
      await this.s3.deleteObject(row.storageKey);
    } catch (error) {
      // Remocao no S3 e best-effort — row ja esta soft-deleted.
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `attachments.s3-delete-failed id=${id} key=${row.storageKey} err=${msg}`,
      );
    }
  }
}
