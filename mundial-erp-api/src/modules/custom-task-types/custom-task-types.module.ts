import { Module } from '@nestjs/common';
import { CustomTaskTypesController } from './custom-task-types.controller';
import { SpaceTaskTypesController } from './space-task-types.controller';
import { CustomTaskTypesService } from './custom-task-types.service';
import { CustomTaskTypesRepository } from './custom-task-types.repository';

@Module({
  controllers: [CustomTaskTypesController, SpaceTaskTypesController],
  providers: [CustomTaskTypesRepository, CustomTaskTypesService],
  exports: [CustomTaskTypesService, CustomTaskTypesRepository],
})
export class CustomTaskTypesModule {}
