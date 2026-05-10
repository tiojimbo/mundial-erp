import { Module } from '@nestjs/common';
import { AutomationsController } from './automations.controller';
import { AutomationsService } from './automations.service';
import { AutomationsRepository } from './automations.repository';

@Module({
  controllers: [AutomationsController],
  providers: [AutomationsRepository, AutomationsService],
  exports: [AutomationsService, AutomationsRepository],
})
export class AutomationsModule {}
