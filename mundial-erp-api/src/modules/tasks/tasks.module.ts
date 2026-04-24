import { Module, forwardRef } from '@nestjs/common';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';
import { TasksRepository } from './tasks.repository';
import { TaskOutboxModule } from '../task-outbox/task-outbox.module';
import { WorkItemsModule } from '../work-items/work-items.module';
import { CustomTaskTypesModule } from '../custom-task-types/custom-task-types.module';
import { TaskDependenciesModule } from '../task-dependencies/task-dependencies.module';
import { TaskLinksModule } from '../task-links/task-links.module';
import { TaskActivitiesModule } from '../task-activities/task-activities.module';
import { AuthModule } from '../auth/auth.module';
import {
  AssigneesSyncService,
  WatchersSyncService,
  TagsSyncService,
} from './services';
import { TasksEventsController } from './sse/tasks-events.controller';
import { TasksEventsService } from './sse/tasks-events.service';
import { TaskSseBusModule } from './sse/task-sse-bus.module';
import { SseJwtGuard } from '../auth/guards/sse-jwt.guard';

/**
 * TasksModule (PLANO-TASKS.md §6, §7.1-7.2).
 *
 * Fachada semantica sobre `WorkItem`:
 *   - `TasksController`: rotas workspace-wide (`/tasks/*`) — list, detail,
 *     patch, delete, archive/unarchive, time-in-status, merge (stub Sprint 6),
 *     activities (stub ate `TaskActivitiesService` ser promovido).
 *   - `TasksService`: orquestra filtros, update com sync de colecoes (assignees/
 *     watchers/tags), archive/unarchive com outbox, time-in-status agregado.
 *   - `TasksRepository`: queries Prisma com `select` explicito (CTO note #4)
 *     e isolamento de tenant em 1a linha (`process.department.workspaceId`).
 *   - `AssigneesSyncService`, `WatchersSyncService`, `TagsSyncService`:
 *     aplicam deltas `{ add, rem }` dentro da `tx` do caller (ADR-001).
 *
 * PrismaService vem do DatabaseModule (@Global). CommonModule e @Global e
 * prove `CycleDetectorService` (uso futuro em merge/dependencies).
 *
 * Registrar em `app.module.ts` APOS `WorkItemsModule` e `TaskOutboxModule`.
 */
@Module({
  imports: [
    forwardRef(() => TaskOutboxModule),
    WorkItemsModule,
    CustomTaskTypesModule,
    // Merge (PLANO §8.4) consome repositories de deps/links para mover
    // arestas dentro da transacao — repos exportados por estes modulos.
    TaskDependenciesModule,
    TaskLinksModule,
    // TaskActivitiesModule exporta `TaskActivitiesRepository` com os metodos
    // `findTaskInWorkspace` e `findAfter` consumidos por `TasksEventsService`.
    TaskActivitiesModule,
    // Bus SSE compartilhado (tb importado por TaskOutboxModule).
    TaskSseBusModule,
    // AuthModule exporta `JwtModule` (JwtService) para `SseJwtGuard`.
    AuthModule,
  ],
  controllers: [TasksController, TasksEventsController],
  providers: [
    TasksRepository,
    TasksService,
    AssigneesSyncService,
    WatchersSyncService,
    TagsSyncService,
    TasksEventsService,
    // `SseJwtGuard` precisa ser provider para ser injetado pelo `@UseGuards()`
    // a nivel de handler (NestJS resolve via DI quando passamos classe).
    SseJwtGuard,
  ],
  exports: [
    TasksService,
    TasksRepository,
    AssigneesSyncService,
    WatchersSyncService,
    TagsSyncService,
    TasksEventsService,
  ],
})
export class TasksModule {}
