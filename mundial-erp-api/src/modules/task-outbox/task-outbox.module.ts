/**
 * TaskOutboxModule (ADR-003, PLANO-TASKS.md §6 / §8.11)
 *
 * Encapsula:
 *   - TaskOutboxService  (API pública de enqueue — consumida por módulos de domínio)
 *   - TaskOutboxRepository (leitura e transições de estado)
 *   - TaskOutboxWorker   (BullMQ processor da fila `task-outbox`)
 *
 * Depende de:
 *   - QueueModule (BullModule.forRootAsync já configurado globalmente)
 *   - NotificationsModule (para criar notifications em DEPENDENCY_UNBLOCKED/MERGED_INTO)
 *   - PrismaService (DatabaseModule é @Global, logo disponível sem import)
 *
 * Exports: `TaskOutboxService` — único ponto de entrada para produtores.
 *
 * Registrar em `app.module.ts` APÓS `QueueModule` e `NotificationsModule`.
 */

import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { NotificationsModule } from '../notifications/notifications.module';
import { TaskSseBusModule } from '../tasks/sse/task-sse-bus.module';
import {
  QUEUE_TASK_OUTBOX,
  QUEUE_TASK_OUTBOX_DLQ,
} from './task-outbox.constants';
import { TaskOutboxCleanupService } from './task-outbox-cleanup.service';
import { TaskOutboxRepository } from './task-outbox.repository';
import { TaskOutboxService } from './task-outbox.service';
import { TaskOutboxWorker } from './task-outbox.worker';

@Module({
  imports: [
    BullModule.registerQueue(
      { name: QUEUE_TASK_OUTBOX },
      { name: QUEUE_TASK_OUTBOX_DLQ },
    ),
    NotificationsModule,
    // Bus SSE: worker publica `activity.created` apos projetar cada
    // WorkItemActivity. `@Optional()` no construtor permite que o worker
    // siga funcional caso o modulo nao seja importado em outro contexto
    // (ex: testes unitarios focados no pipeline retry).
    TaskSseBusModule,
  ],
  providers: [
    TaskOutboxRepository,
    TaskOutboxService,
    TaskOutboxWorker,
    TaskOutboxCleanupService,
  ],
  exports: [TaskOutboxService],
})
export class TaskOutboxModule {}
