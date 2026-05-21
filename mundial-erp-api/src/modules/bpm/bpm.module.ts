import { Module, forwardRef } from '@nestjs/common';

import { OrderStatusMachine } from './engine/order-status-machine';

import { SectorsRepository } from './definitions/sectors/sectors.repository';
import { ActivitiesRepository } from './definitions/activities/activities.repository';
import { HandoffsRepository } from './definitions/handoffs/handoffs.repository';

import { SectorsService } from './definitions/sectors/sectors.service';
import { ActivitiesService } from './definitions/activities/activities.service';
import { HandoffsService } from './definitions/handoffs/handoffs.service';

import { SectorsController } from './definitions/sectors/sectors.controller';
import { ActivitiesController } from './definitions/activities/activities.controller';
import { HandoffsController } from './definitions/handoffs/handoffs.controller';

import { SpacesModule } from '../spaces/spaces.module';
import { FoldersModule } from '../folders/folders.module';

@Module({
  imports: [forwardRef(() => SpacesModule), forwardRef(() => FoldersModule)],
  controllers: [
    SectorsController,
    ActivitiesController,
    HandoffsController,
  ],
  providers: [
    OrderStatusMachine,
    SectorsRepository,
    ActivitiesRepository,
    HandoffsRepository,
    SectorsService,
    ActivitiesService,
    HandoffsService,
  ],
  exports: [OrderStatusMachine],
})
export class BpmModule {}
