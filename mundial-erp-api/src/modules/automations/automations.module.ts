import { Global, Module } from '@nestjs/common';
import { AutomationsController } from './automations.controller';
import { AutomationsService } from './automations.service';
import { AutomationsRepository } from './automations.repository';
import { TaskEventsPublisher } from './events/task-events.publisher';
import { AutomationListener } from './events/automation.listener';

@Global()
@Module({
  controllers: [AutomationsController],
  providers: [
    AutomationsRepository,
    AutomationsService,
    TaskEventsPublisher,
    AutomationListener,
  ],
  exports: [AutomationsService, AutomationsRepository, TaskEventsPublisher],
})
export class AutomationsModule {}
