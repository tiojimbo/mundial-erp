import { BullModule } from '@nestjs/bullmq';
import { Global, Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { QUEUE_AUTOMATION_EXECUTION } from '../queue/queue.constants';
import { AutomationsController } from './automations.controller';
import { AutomationsService } from './automations.service';
import { AutomationsRepository } from './automations.repository';
import { AutomationsCacheService } from './cache/automations-cache.service';
import { CronSchedulerService } from './cron/cron-scheduler.service';
import { TaskEventsPublisher } from './events/task-events.publisher';
import { AutomationListener } from './events/automation.listener';
import { AutomationEngineService } from './engine/automation-engine.service';
import { ActionRunnerService } from './engine/action-runner.service';
import { AutomationProcessor } from './engine/automation.processor';

@Global()
@Module({
  imports: [
    BullModule.registerQueue({ name: QUEUE_AUTOMATION_EXECUTION }),
    ScheduleModule.forRoot(),
  ],
  controllers: [AutomationsController],
  providers: [
    AutomationsRepository,
    AutomationsService,
    AutomationsCacheService,
    TaskEventsPublisher,
    AutomationListener,
    AutomationEngineService,
    ActionRunnerService,
    AutomationProcessor,
    CronSchedulerService,
  ],
  exports: [AutomationsService, AutomationsRepository, TaskEventsPublisher],
})
export class AutomationsModule {}
