import { Module } from '@nestjs/common';

import { OrderStatusMachine } from './engine/order-status-machine';

import { SpacesRepository } from './definitions/spaces/spaces.repository';
import { SectorsRepository } from './definitions/sectors/sectors.repository';
import { FoldersRepository } from './definitions/folders/folders.repository';
import { ListsRepository } from './definitions/lists/lists.repository';
import { ActivitiesRepository } from './definitions/activities/activities.repository';
import { TasksRepository } from './definitions/tasks/tasks.repository';
import { HandoffsRepository } from './definitions/handoffs/handoffs.repository';
import { WorkflowStatusesRepository } from './definitions/workflow-statuses/workflow-statuses.repository';

import { SpacesService } from './definitions/spaces/spaces.service';
import { SectorsService } from './definitions/sectors/sectors.service';
import { FoldersService } from './definitions/folders/folders.service';
import { ListsService } from './definitions/lists/lists.service';
import { ActivitiesService } from './definitions/activities/activities.service';
import { TasksService } from './definitions/tasks/tasks.service';
import { HandoffsService } from './definitions/handoffs/handoffs.service';
import { WorkflowStatusesService } from './definitions/workflow-statuses/workflow-statuses.service';

import { SpacesController } from './definitions/spaces/spaces.controller';
import { SectorsController } from './definitions/sectors/sectors.controller';
import { FoldersController } from './definitions/folders/folders.controller';
import { ListsController } from './definitions/lists/lists.controller';
import { ActivitiesController } from './definitions/activities/activities.controller';
import { TasksController } from './definitions/tasks/tasks.controller';
import { HandoffsController } from './definitions/handoffs/handoffs.controller';
import { WorkflowStatusesController } from './definitions/workflow-statuses/workflow-statuses.controller';

@Module({
  controllers: [
    SpacesController,
    SectorsController,
    FoldersController,
    ListsController,
    ActivitiesController,
    TasksController,
    HandoffsController,
    WorkflowStatusesController,
  ],
  providers: [
    OrderStatusMachine,
    SpacesRepository,
    SectorsRepository,
    FoldersRepository,
    ListsRepository,
    ActivitiesRepository,
    TasksRepository,
    HandoffsRepository,
    WorkflowStatusesRepository,
    SpacesService,
    SectorsService,
    FoldersService,
    ListsService,
    ActivitiesService,
    TasksService,
    HandoffsService,
    WorkflowStatusesService,
  ],
  exports: [OrderStatusMachine],
})
export class BpmModule {}
