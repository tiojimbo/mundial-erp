import { BullModule } from '@nestjs/bullmq';
import { Global, Module } from '@nestjs/common';
import { QUEUE_AUTOMATION_EXECUTION } from '../queue/queue.constants';
import { AutomationsController } from './automations.controller';
import { AutomationsService } from './automations.service';
import { AutomationsRepository } from './automations.repository';
import { TaskEventsPublisher } from './events/task-events.publisher';
import { AutomationListener } from './events/automation.listener';
import { AutomationEngineService } from './engine/automation-engine.service';
import { ActionRunnerService } from './engine/action-runner.service';
import { AutomationProcessor } from './engine/automation.processor';

@Global()
@Module({
  imports: [BullModule.registerQueue({ name: QUEUE_AUTOMATION_EXECUTION })],
  controllers: [AutomationsController],
  providers: [
    AutomationsRepository,
    AutomationsService,
    TaskEventsPublisher,
    AutomationListener,
    AutomationEngineService,
    ActionRunnerService,
    AutomationProcessor,
  ],
  exports: [AutomationsService, AutomationsRepository, TaskEventsPublisher],
})
export class AutomationsModule {}
