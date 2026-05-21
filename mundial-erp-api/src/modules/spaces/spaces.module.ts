import { Module, forwardRef } from '@nestjs/common';
import { SpacesController } from './spaces.controller';
import { SpacesService } from './spaces.service';
import { SpacesRepository } from './spaces.repository';
import { DatabaseModule } from '../../database/database.module';
import { BpmModule } from '../bpm/bpm.module';

@Module({
  imports: [DatabaseModule, forwardRef(() => BpmModule)],
  controllers: [SpacesController],
  providers: [SpacesService, SpacesRepository],
  exports: [SpacesService, SpacesRepository],
})
export class SpacesModule {}
