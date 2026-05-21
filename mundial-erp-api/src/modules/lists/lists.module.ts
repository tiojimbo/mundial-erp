import { Module, forwardRef } from '@nestjs/common';
import { ListsController } from './lists.controller';
import { ListsService } from './lists.service';
import { ListsRepository } from './lists.repository';
import { DatabaseModule } from '../../database/database.module';
import { SpacesModule } from '../spaces/spaces.module';
import { FoldersModule } from '../folders/folders.module';

@Module({
  imports: [
    DatabaseModule,
    forwardRef(() => SpacesModule),
    forwardRef(() => FoldersModule),
  ],
  controllers: [ListsController],
  providers: [ListsService, ListsRepository],
  exports: [ListsService, ListsRepository],
})
export class ListsModule {}
