import { Module } from '@nestjs/common';

// Engine
import { OrderStatusMachine } from './engine/order-status-machine';
import { BpmEngineService } from './engine/bpm-engine.service';

// Definition Repositories
import { DepartmentsRepository } from './definitions/departments/departments.repository';
import { SectorsRepository } from './definitions/sectors/sectors.repository';
import { AreasRepository } from './definitions/areas/areas.repository';
import { ProcessesRepository } from './definitions/processes/processes.repository';
import { ActivitiesRepository } from './definitions/activities/activities.repository';
import { TasksRepository } from './definitions/tasks/tasks.repository';
import { HandoffsRepository } from './definitions/handoffs/handoffs.repository';
import { WorkflowStatusesRepository } from './definitions/workflow-statuses/workflow-statuses.repository';

// Definition Services
import { DepartmentsService } from './definitions/departments/departments.service';
import { SectorsService } from './definitions/sectors/sectors.service';
import { AreasService } from './definitions/areas/areas.service';
import { ProcessesService } from './definitions/processes/processes.service';
import { ActivitiesService } from './definitions/activities/activities.service';
import { TasksService } from './definitions/tasks/tasks.service';
import { HandoffsService } from './definitions/handoffs/handoffs.service';
import { WorkflowStatusesService } from './definitions/workflow-statuses/workflow-statuses.service';

// Definition Controllers
import { DepartmentsController } from './definitions/departments/departments.controller';
import { SectorsController } from './definitions/sectors/sectors.controller';
import { AreasController } from './definitions/areas/areas.controller';
import { ProcessesController } from './definitions/processes/processes.controller';
import { ActivitiesController } from './definitions/activities/activities.controller';
import { TasksController } from './definitions/tasks/tasks.controller';
import { HandoffsController } from './definitions/handoffs/handoffs.controller';
import { WorkflowStatusesController } from './definitions/workflow-statuses/workflow-statuses.controller';

// Runtime Repositories
import { ProcessInstancesRepository } from './runtime/process-instances/process-instances.repository';
import { ActivityInstancesRepository } from './runtime/activity-instances/activity-instances.repository';
import { TaskInstancesRepository } from './runtime/task-instances/task-instances.repository';
import { HandoffInstancesRepository } from './runtime/handoff-instances/handoff-instances.repository';

// Runtime Services
import { ProcessInstancesService } from './runtime/process-instances/process-instances.service';
import { ActivityInstancesService } from './runtime/activity-instances/activity-instances.service';
import { TaskInstancesService } from './runtime/task-instances/task-instances.service';
import { HandoffInstancesService } from './runtime/handoff-instances/handoff-instances.service';

// Runtime Controllers
import { ProcessInstancesController } from './runtime/process-instances/process-instances.controller';
import { ActivityInstancesController } from './runtime/activity-instances/activity-instances.controller';
import { TaskInstancesController } from './runtime/task-instances/task-instances.controller';
import { HandoffInstancesController } from './runtime/handoff-instances/handoff-instances.controller';

@Module({
  controllers: [
    // Definition
    DepartmentsController,
    SectorsController,
    AreasController,
    ProcessesController,
    ActivitiesController,
    TasksController,
    HandoffsController,
    WorkflowStatusesController,
    // Runtime
    ProcessInstancesController,
    ActivityInstancesController,
    TaskInstancesController,
    HandoffInstancesController,
  ],
  providers: [
    // Engine
    OrderStatusMachine,
    BpmEngineService,
    // Definition Repositories
    DepartmentsRepository,
    SectorsRepository,
    AreasRepository,
    ProcessesRepository,
    ActivitiesRepository,
    TasksRepository,
    HandoffsRepository,
    WorkflowStatusesRepository,
    // Definition Services
    DepartmentsService,
    SectorsService,
    AreasService,
    ProcessesService,
    ActivitiesService,
    TasksService,
    HandoffsService,
    WorkflowStatusesService,
    // Runtime Repositories
    ProcessInstancesRepository,
    ActivityInstancesRepository,
    TaskInstancesRepository,
    HandoffInstancesRepository,
    // Runtime Services
    ProcessInstancesService,
    ActivityInstancesService,
    TaskInstancesService,
    HandoffInstancesService,
  ],
  exports: [
    OrderStatusMachine,
    BpmEngineService,
    ProcessInstancesRepository,
    HandoffInstancesService,
  ],
})
export class BpmModule {}
