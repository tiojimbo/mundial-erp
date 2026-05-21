/**
 * TaskAttachmentsModule (TSK-405)
 *
 * Registra fila BullMQ `clamav-scan` (concurrency 3, attempts 5, backoff 30s).
 * Depende de:
 *   - QueueModule (BullModule.forRootAsync global — ja registrado em app.module)
 *   - NotificationsModule (worker envia SYSTEM ao uploader em INFECTED)
 *   - TaskOutboxModule (emite ATTACHMENT_ADDED para o activity worker)
 *   - CommonModule (@Global) — S3AdapterService + FileTypeDetectorService
 *
 * Registrar em `app.module.ts` apos QueueModule + NotificationsModule +
 * TaskOutboxModule (TODO nao feito aqui — ver relatorio).
 */
import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { NotificationsModule } from '../notifications/notifications.module';
import { TaskOutboxModule } from '../task-outbox/task-outbox.module';
import { TaskTypeTemplatesModule } from '../task-type-templates/task-type-templates.module';
import { TaskAttachmentsController } from './task-attachments.controller';
import { TaskAttachmentsService } from './task-attachments.service';
import { TaskAttachmentsRepository } from './task-attachments.repository';
import { ClamAvScanWorker } from './workers/clamav-scan.worker';
import { CLAMAV_SCAN_QUEUE } from './workers/clamav-scan.constants';

@Module({
  imports: [
    BullModule.registerQueue({ name: CLAMAV_SCAN_QUEUE }),
    NotificationsModule,
    forwardRef(() => TaskOutboxModule),
    // TTT-043 — service valida `category` contra attachmentCategories do
    // template do CustomTaskType da task. Repository (read direto) ja e
    // exportado por TaskTypeTemplatesModule e usado abaixo no service.
    TaskTypeTemplatesModule,
  ],
  controllers: [TaskAttachmentsController],
  providers: [
    TaskAttachmentsRepository,
    TaskAttachmentsService,
    ClamAvScanWorker,
  ],
  exports: [TaskAttachmentsService, TaskAttachmentsRepository],
})
export class TaskAttachmentsModule {}
